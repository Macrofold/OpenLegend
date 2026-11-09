//! One private sensing phase owns timing, held interpretation, scoped physical
//! acquisition and complete human/native reception. Children must return their
//! actual sealed completions before this phase can finish.
use super::visual::requested_visual_details;
use super::*;
use crate::events::CompletedEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::state::EntityHandle;
use indexmap::IndexMap;
use std::{mem::size_of, sync::Arc};

pub(crate) fn physical_sampling_due(
    core: &CoreMutation<'_>,
    selected: &[EntityHandle],
    policies: &mut RoutinePolicyCache,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    for handle in selected {
        let observer = core
            .state
            .physical
            .entities
            .resolve(*handle)
            .ok_or(ExecutionError::MissingActor)?;
        let policy = policies.policy(observer)?;
        let work = ContactMeasurements::prepare(core.state, &observer.id, budget)?.due_work(
            core.state,
            &observer.id,
            budget,
        )?;
        if RoutineObservation::prepare(core.state, *handle, &policy, work, budget)?.due() {
            return Ok(true);
        }
    }
    Ok(false)
}
pub(crate) enum PerceptionAnswer {
    Geometry(GeometryAnswers),
    Held(CompletedHeldReception),
    Human(CompletedObserverReception),
    Native(CompletedNativeExposure),
}
pub(crate) enum PerceptionStep<'a> {
    Continue,
    Geometry(&'a GeometryQueries),
    Held(&'a mut HeldReceptionCursor),
    Human(&'a mut ObserverReceptionCursor),
    Native(&'a mut NativeExposureCursor),
    Complete(CompletedPerception),
}
pub(crate) struct CompletedPerception {
    pub events: Vec<CompletedEvent>,
    /// Source returns requested sight, including cleanup with no new grant.
    pub requested_sight: Vec<EntityHandle>,
    pub policies: RoutinePolicyCache,
    _reservation: ByteReservation,
}
struct Entry {
    id: String,
    timing: Option<RoutineObservation>,
    policy: Option<Arc<RoutinePolicy>>,
    opportunity: Option<VisualOpportunity>,
    scope: Option<usize>,
    captured: bool,
    requested_sight: bool,
}
enum Phase {
    Retire,
    Timing,
    Exposure,
    Clean,
    Select,
    Receive,
    Finish,
    Done,
}
pub(crate) struct PerceptionCursor {
    entries: IndexMap<EntityHandle, Entry>,
    selected: Vec<EntityHandle>,
    policies: Option<RoutinePolicyCache>,
    exposure: Option<ExposureSelection>,
    completed: IndexMap<String, CurrentCheck>,
    revision: u64,
    phase: Phase,
    index: usize,
    candidate: CandidateKey,
    held: Option<HeldReceptionCursor>,
    human: Option<ObserverReceptionCursor>,
    native: Option<NativeExposureCursor>,
    sight: Option<SightBatch>,
    waiting: Option<EntityHandle>,
    events: Vec<CompletedEvent>,
    reservation: Option<ByteReservation>,
}
fn invalid() -> ObserverReceptionError {
    ExecutionError::Invariant.into()
}
impl PerceptionCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        selected: &[EntityHandle],
        policies: RoutinePolicyCache,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ObserverReceptionError> {
        let ids = selected
            .iter()
            .try_fold(0usize, |sum, handle| {
                sum.checked_add(core.state.physical.entities.resolve(*handle)?.id.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                ids,
                map_storage::<EntityHandle, Entry>(selected.len())
                    .ok_or(ExecutionError::Capacity)?,
                selected
                    .len()
                    .checked_mul(8 * size_of::<EntityHandle>())
                    .ok_or(ExecutionError::Capacity)?,
                map_storage::<String, CurrentCheck>(selected.len())
                    .ok_or(ExecutionError::Capacity)?,
                selected
                    .len()
                    .checked_mul(128)
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut entries = IndexMap::with_capacity(selected.len());
        for handle in selected {
            let entity = core
                .state
                .physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::MissingActor)?;
            entries.insert(
                *handle,
                Entry {
                    id: entity.id.clone(),
                    timing: None,
                    policy: None,
                    opportunity: None,
                    scope: None,
                    captured: false,
                    requested_sight: false,
                },
            );
        }
        core.journal.sensory.initialize(
            &mut core.state.reception,
            core.state.physical.header.sim_time,
        )?;
        let revision = core
            .state
            .reception
            .sensory
            .as_ref()
            .ok_or_else(invalid)?
            .revision;
        Ok(Self {
            entries,
            selected: selected.to_vec(),
            policies: Some(policies),
            exposure: None,
            completed: IndexMap::new(),
            revision,
            phase: Phase::Retire,
            index: 0,
            candidate,
            held: None,
            human: None,
            native: None,
            sight: None,
            waiting: None,
            events: Vec::new(),
            reservation: Some(reservation),
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ObserverReceptionError> {
        let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<PerceptionAnswer>,
        budget: &ByteBudget,
    ) -> Result<PerceptionStep<'a>, ObserverReceptionError> {
        if self.held.is_some() {
            match answer.take() {
                None => {
                    return Ok(PerceptionStep::Held(
                        self.held.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Some(PerceptionAnswer::Held(done)) => {
                    if self
                        .entries
                        .get(&self.waiting.ok_or_else(invalid)?)
                        .ok_or_else(invalid)?
                        .id
                        != done.observer
                    {
                        return Err(invalid());
                    }
                    self.held = None;
                    self.waiting = None;
                }
                _ => return Err(invalid()),
            }
        } else if self.human.is_some() {
            match answer.take() {
                None => {
                    return Ok(PerceptionStep::Human(
                        self.human.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Some(PerceptionAnswer::Human(mut done)) => {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(self.waiting.ok_or_else(invalid)?)
                        .ok_or(ExecutionError::MissingActor)?;
                    if entity.id != done.observer().actor_id
                        || entity.physical_life() != Some(done.observer().physical_life)
                    {
                        return Err(invalid());
                    }
                    if self.events.len() + done.events.len() > self.events.capacity() {
                        self.reserve(
                            (self.events.len() + done.events.len())
                                .checked_mul(2 * size_of::<CompletedEvent>())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.events
                            .try_reserve(done.events.len())
                            .map_err(|_| ExecutionError::Capacity)?;
                    }
                    self.events.append(&mut done.events);
                    self.human = None;
                    self.waiting = None;
                }
                _ => return Err(invalid()),
            }
        } else if self.native.is_some() {
            match answer.take() {
                None => {
                    return Ok(PerceptionStep::Native(
                        self.native.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Some(PerceptionAnswer::Native(done)) => {
                    if self
                        .entries
                        .get(&self.waiting.ok_or_else(invalid)?)
                        .ok_or_else(invalid)?
                        .id
                        != done.observer
                    {
                        return Err(invalid());
                    }
                    self.native = None;
                    self.waiting = None;
                }
                _ => return Err(invalid()),
            }
        } else if self.sight.is_some() {
            match answer.take() {
                None => {
                    return Ok(PerceptionStep::Geometry(
                        self.sight.as_ref().ok_or_else(invalid)?.queries(),
                    ));
                }
                Some(PerceptionAnswer::Geometry(answer)) => {
                    let sight = self
                        .sight
                        .take()
                        .ok_or_else(invalid)?
                        .finish(answer)
                        .map_err(ExecutionError::Sensor)?;
                    let entry = self
                        .entries
                        .get_mut(&self.waiting.ok_or_else(invalid)?)
                        .ok_or_else(invalid)?;
                    self.human = Some(ObserverReceptionCursor::prepare(
                        core,
                        sight,
                        entry.opportunity.take().ok_or_else(invalid)?,
                        self.candidate,
                        budget,
                    )?);
                    return Ok(PerceptionStep::Human(
                        self.human.as_mut().ok_or_else(invalid)?,
                    ));
                }
                _ => return Err(invalid()),
            }
        } else if answer.is_some() {
            return Err(invalid());
        }
        loop {
            match self.phase {
                Phase::Retire => {
                    if self.index == self.selected.len() {
                        self.index = 0;
                        self.phase = Phase::Timing;
                        continue;
                    }
                    let handle = self.selected[self.index];
                    self.index += 1;
                    let id = &self.entries.get(&handle).ok_or_else(invalid)?.id;
                    super::phase::prepare_observer_phase(core, id, budget)?;
                    return Ok(PerceptionStep::Continue);
                }
                Phase::Timing => {
                    if self.index == self.selected.len() {
                        self.index = 0;
                        self.phase = Phase::Exposure;
                        continue;
                    }
                    let handle = self.selected[self.index];
                    self.index += 1;
                    let entry = self.entries.get_mut(&handle).ok_or_else(invalid)?;
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::MissingActor)?;
                    let policy = self.policies.as_mut().ok_or_else(invalid)?.policy(entity)?;
                    let scheduled = super::sensory::sight_scope_due_prepared(
                        &core.state.reception,
                        &core.state.physical,
                        entity,
                        policy.sight.as_ref(),
                    );
                    let work = ContactMeasurements::prepare(core.state, &entry.id, budget)?
                        .due_work(core.state, &entry.id, budget)?;
                    let mut timing =
                        RoutineObservation::prepare(core.state, handle, &policy, work, budget)?;
                    if timing.contact
                        && (policy.contact.is_some()
                            || entity
                                .actor
                                .as_ref()
                                .and_then(|actor| actor.contacts.as_ref())
                                .is_some_and(|contacts| !contacts.is_empty()))
                    {
                        return Err(ExecutionError::UnsupportedFamily.into());
                    }
                    timing.record_progress(&mut core.physical())?;
                    entry.requested_sight = timing.sight;
                    if timing.sight
                        && let Some(scheduled) = scheduled
                        && let Some(sight) = policy
                            .sight
                            .as_ref()
                            .filter(|sight| sight.mode == SightTiming::Cadence)
                    {
                        if !timing.detail || !self.completed.contains_key(&sight.key) {
                            // One policy mark covers the actual selected cohort.
                            let key = sight.key.clone();
                            self.completed.insert(key, scheduled);
                        }
                    }
                    let held = !timing.sight;
                    entry.timing = Some(timing);
                    entry.policy = Some(policy);
                    if held {
                        self.held = Some(HeldReceptionCursor::prepare(
                            core,
                            &entry.id,
                            self.candidate,
                            budget,
                        )?);
                        self.waiting = Some(handle);
                        return Ok(PerceptionStep::Held(
                            self.held.as_mut().ok_or_else(invalid)?,
                        ));
                    }
                    return Ok(PerceptionStep::Continue);
                }
                Phase::Exposure => {
                    let readers = self
                        .entries
                        .iter()
                        .filter(|(_, entry)| {
                            entry
                                .timing
                                .as_ref()
                                .is_some_and(|timing| timing.sight || timing.contact)
                        })
                        .map(|(handle, _)| *handle)
                        .collect::<Vec<_>>();
                    if readers.is_empty() {
                        self.phase = Phase::Finish;
                        continue;
                    }
                    let mut exposure = ExposureSelection::prepare(core.state, &readers, budget)?;
                    core.journal.current.set_exposure_objects(
                        &mut core.state.reception,
                        exposure.objects.take().ok_or_else(invalid)?,
                    )?;
                    for (index, observer) in exposure.observers.iter().enumerate() {
                        self.entries
                            .get_mut(&observer.handle)
                            .ok_or_else(invalid)?
                            .scope = Some(index);
                    }
                    self.exposure = Some(exposure);
                    self.phase = Phase::Clean;
                    self.index = 0;
                }
                Phase::Clean => {
                    if self.index == self.entries.len() {
                        self.index = 0;
                        self.phase = Phase::Select;
                        continue;
                    }
                    let (handle, entry) =
                        self.entries.get_index_mut(self.index).ok_or_else(invalid)?;
                    let handle = *handle;
                    self.index += 1;
                    let Some(scope) = entry.scope else {
                        continue;
                    };
                    let observer = &self.exposure.as_ref().ok_or_else(invalid)?.observers[scope];
                    let timing = entry.timing.as_mut().ok_or_else(invalid)?;
                    if timing.sampled_sight
                        && !timing.immediate
                        && timing.measurement.subjects.is_empty()
                        && !observer.affected
                    {
                        timing.sight = false;
                        entry.requested_sight = false;
                        self.held = Some(HeldReceptionCursor::prepare(
                            core,
                            &entry.id,
                            self.candidate,
                            budget,
                        )?);
                        self.waiting = Some(handle);
                        return Ok(PerceptionStep::Held(
                            self.held.as_mut().ok_or_else(invalid)?,
                        ));
                    }
                    return Ok(PerceptionStep::Continue);
                }
                Phase::Select => {
                    let exposure = self.exposure.as_ref().ok_or_else(invalid)?;
                    if self.index == exposure.observers.len() {
                        self.index = 0;
                        self.phase = Phase::Receive;
                        continue;
                    }
                    let scope = &exposure.observers[self.index];
                    self.index += 1;
                    let entry = self.entries.get_mut(&scope.handle).ok_or_else(invalid)?;
                    let timing = entry.timing.as_ref().ok_or_else(invalid)?;
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(scope.handle)
                        .ok_or(ExecutionError::MissingActor)?;
                    let review = entity
                        .animal
                        .as_ref()
                        .and_then(|animal| animal.episode.as_ref())
                        .is_some_and(|episode| {
                            episode.review_at <= core.state.physical.header.sim_time
                        });
                    entry.captured = scope.affected
                        || timing.immediate
                        || timing.detail
                        || timing.sampled_contact
                        || review;
                    if entry.captured
                        && timing.sight
                        && timing.detail
                        && entity.has_memory()
                        && sensors::vision_parameters(&core.state.installed, entity).radius > 0.0
                        && !core
                            .state
                            .installed
                            .capabilities
                            .capability_blocked(Some(entity), "perception")
                            .map_err(ExecutionError::Values)?
                    {
                        super::held::select_received_attention(core, &entry.id, budget)?;
                    }
                    return Ok(PerceptionStep::Continue);
                }
                Phase::Receive => {
                    let exposure = self.exposure.as_ref().ok_or_else(invalid)?;
                    if self.index == exposure.observers.len() {
                        self.phase = Phase::Finish;
                        continue;
                    }
                    let scope = &exposure.observers[self.index];
                    let handle = scope.handle;
                    self.index += 1;
                    let entry = self.entries.get_mut(&handle).ok_or_else(invalid)?;
                    let mut timing = entry.timing.take().ok_or_else(invalid)?;
                    if !entry.captured || !timing.sight {
                        continue;
                    }
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::MissingActor)?;
                    let enabled = !core
                        .state
                        .installed
                        .capabilities
                        .capability_blocked(Some(entity), "perception")
                        .map_err(ExecutionError::Values)?
                        && sensors::vision_parameters(&core.state.installed, entity).radius > 0.0;
                    if !enabled {
                        core.journal
                            .current
                            .clear_visibility(&mut core.state.reception, &entry.id)?;
                        core.journal
                            .current
                            .clear_visible_places(&mut core.state.reception, &entry.id)?;
                        core.journal
                            .episodes
                            .clear_observer(&mut core.state.reception, &entry.id)?;
                        continue;
                    }
                    self.waiting = Some(handle);
                    if !entity.has_memory() {
                        self.native = Some(NativeExposureCursor::prepare(
                            core,
                            &entry.id,
                            self.candidate,
                            budget,
                        )?);
                        return Ok(PerceptionStep::Native(
                            self.native.as_mut().ok_or_else(invalid)?,
                        ));
                    }
                    let opportunity = VisualOpportunity {
                        detail_only: timing.detail,
                        immediate: timing.immediate,
                        due_subjects: std::mem::take(&mut timing.measurement.subjects),
                        changed_detail_subjects: None,
                        changed_people: None,
                        objects_changed: scope.objects_changed,
                    };
                    let mut opportunity = opportunity;
                    // Transfer the exact scope set, not a copy of another observer's inputs.
                    opportunity.changed_detail_subjects =
                        self.exposure.as_mut().ok_or_else(invalid)?.observers
                            [entry.scope.ok_or_else(invalid)?]
                        .changed_detail
                        .take();
                    opportunity.changed_people =
                        self.exposure.as_mut().ok_or_else(invalid)?.observers
                            [entry.scope.ok_or_else(invalid)?]
                        .changed_people
                        .take();
                    let details = if timing.detail {
                        Some(requested_visual_details(
                            core,
                            &entry.id,
                            &opportunity,
                            budget,
                        )?)
                    } else {
                        None
                    };
                    let entity = core
                        .state
                        .physical
                        .entities
                        .resolve(handle)
                        .ok_or(ExecutionError::MissingActor)?;
                    let origin = entity
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let radius =
                        sensors::vision_parameters(&core.state.installed, entity).radius + 2.0;
                    let (count, _) = core
                        .state
                        .physical
                        .bodies
                        .candidate_capacity(origin, radius);
                    let _targets = budget.reserve(
                        count
                            .checked_mul(5 * size_of::<(&str, EntityHandle)>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let targets = core
                        .state
                        .physical
                        .bodies
                        .candidates(origin, radius)
                        .into_iter()
                        .filter(|(id, _)| {
                            details
                                .as_ref()
                                .is_none_or(|details| details.ids.contains(*id))
                        })
                        .map(|(id, _)| id)
                        .collect::<Vec<_>>();
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    let batch = SightBatch::prepare(
                        &core.state.physical,
                        &core.state.installed,
                        &entry.id,
                        &targets,
                        binding,
                        budget,
                    )
                    .map_err(ExecutionError::Sensor)?;
                    entry.opportunity = Some(opportunity);
                    if batch.queries().is_empty() {
                        let sight = batch
                            .finish_sight(binding, &[])
                            .map_err(ExecutionError::Sensor)?;
                        self.human = Some(ObserverReceptionCursor::prepare(
                            core,
                            sight,
                            entry.opportunity.take().ok_or_else(invalid)?,
                            self.candidate,
                            budget,
                        )?);
                        return Ok(PerceptionStep::Human(
                            self.human.as_mut().ok_or_else(invalid)?,
                        ));
                    }
                    self.sight = Some(batch);
                    return Ok(PerceptionStep::Geometry(
                        self.sight.as_ref().ok_or_else(invalid)?.queries(),
                    ));
                }
                Phase::Finish => {
                    if self.exposure.is_some() {
                        core.journal.sensory.complete_sight_work(
                            &mut core.state.reception,
                            &core.state.physical,
                            &core.state.installed,
                            &self.selected,
                            self.policies.as_mut().ok_or_else(invalid)?,
                            &self.completed,
                            self.revision,
                        )?;
                        core.journal
                            .current
                            .complete_exposure_preparation(&mut core.state.reception)?;
                    }
                    self.phase = Phase::Done;
                    return Ok(PerceptionStep::Complete(CompletedPerception {
                        events: std::mem::take(&mut self.events),
                        requested_sight: self
                            .entries
                            .iter()
                            .filter(|(_, entry)| entry.requested_sight)
                            .map(|(handle, _)| *handle)
                            .collect(),
                        policies: self.policies.take().ok_or_else(invalid)?,
                        _reservation: self.reservation.take().ok_or_else(invalid)?,
                    }));
                }
                Phase::Done => return Err(invalid()),
            }
        }
    }
}
