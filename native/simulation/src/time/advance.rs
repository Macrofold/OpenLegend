//! One ordered elapsed transition over the selected installed family closure.
//! Provider work and child commands return sealed completions. Time, effects,
//! receiving and publication remain in this one rollback-owned candidate.
use super::input::{AdmittedWorldInput, PreparedSteering, SteeringPreparation, input_boundary};
use super::navigation::{NavigationGate, NavigationGateStep};
use super::reconcile::{ReconcileAnswer, ReconcileCursor, ReconcileStep};
use super::sensing::sensory_bound;
use super::{
    EndpointAnswer, EndpointCursor, EndpointStep, MechanicalForecast, MotionSliceCursor,
    NativeParticipants, ParticipantPreparation, SliceActions, next_animal_review,
    private_motion_seconds,
};
use crate::commands::{
    CommandOperation, CommandOperationError, CompletedCommandOperation, Outcome,
    begin_native_movement, begin_native_stop,
};
use crate::events::{
    CompletedEvent, EventAccountPlacement, EventCursor, WorldEvent, begin_staged_occurrence,
};
use crate::execution::{
    CandidateCheckpoint, CoreMutation, ExecutionError, PhysicalChangeCursor, StagedOccurrence,
    StatusReconcileCursor,
};
use crate::experience::{
    MemoryAcquisitionError, ResultAcquisitionError, acquire_activity_result, advance_commitments,
    expire_sensory_awareness, prepare_activity_result,
};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::HeapBytes;
use crate::host::{AcceptedCandidate, ByteBudget, ByteReservation, CandidateKey};
use crate::identity::MAX_SAFE_INTEGER;
use crate::language::{CollationAnswer, CollationRequest};
use crate::movement::{MoveAdvanceAnswer, MoveAdvanceCursor, MoveAdvanceStep};
use crate::native_controller::{
    GroundResponseCursor, GroundResponseDecision, GroundResponseStep, WanderCursor, WanderStep,
    advance_wander_clock, expire_acoustic_patterns, reconcile_wander,
};
use crate::native_refuge::{PendingRefugeNavigation, PreparedRefugeNavigation};
use crate::native_response::{LocomotionMode, NavigationWait};
use crate::plans::{CompletedPlanRun, PlanRunCursor};
use crate::reception::{
    CompletedPerception, ObserverReceptionError, PerceptionCursor, RoutinePolicyCache,
    next_perception_work_at, physical_sampling_due,
};
use crate::state::{EntityHandle, NativeInterval};
use std::mem::size_of;
use std::sync::Arc;

#[derive(Debug)]
pub(crate) enum AdvanceError {
    Execution(ExecutionError),
    Command(CommandOperationError),
    Result(ResultAcquisitionError),
    Memory(MemoryAcquisitionError),
    Reception(ObserverReceptionError),
}
impl From<ExecutionError> for AdvanceError {
    fn from(e: ExecutionError) -> Self {
        Self::Execution(e)
    }
}
impl From<CommandOperationError> for AdvanceError {
    fn from(e: CommandOperationError) -> Self {
        Self::Command(e)
    }
}
impl From<ResultAcquisitionError> for AdvanceError {
    fn from(e: ResultAcquisitionError) -> Self {
        Self::Result(e)
    }
}
impl From<MemoryAcquisitionError> for AdvanceError {
    fn from(e: MemoryAcquisitionError) -> Self {
        Self::Memory(e)
    }
}
impl From<ObserverReceptionError> for AdvanceError {
    fn from(e: ObserverReceptionError) -> Self {
        Self::Reception(e)
    }
}
impl From<crate::received::ReceivedError> for AdvanceError {
    fn from(e: crate::received::ReceivedError) -> Self {
        ExecutionError::from(e).into()
    }
}
impl From<crate::host::CapacityError> for AdvanceError {
    fn from(_: crate::host::CapacityError) -> Self {
        ExecutionError::Capacity.into()
    }
}
impl From<crate::values::ValueError> for AdvanceError {
    fn from(e: crate::values::ValueError) -> Self {
        ExecutionError::from(e).into()
    }
}

pub(crate) enum AdvanceAnswer {
    Geometry(GeometryAnswers),
    Collation(CollationAnswer),
    Event(CompletedEvent),
    Plan(CompletedPlanRun),
    Command(CompletedCommandOperation),
    Perception(CompletedPerception),
}
pub(crate) enum AdvanceStep<'a> {
    Continue,
    Geometry(&'a GeometryQueries),
    Collation(&'a CollationRequest),
    Event(&'a mut EventCursor),
    Plan(&'a mut PlanRunCursor),
    Command(&'a mut CommandOperation),
    Perception(&'a mut PerceptionCursor),
    Complete(CompletedAdvance),
}
enum EventBatch {
    Event {
        event: WorldEvent,
        _reservation: ByteReservation,
    },
    Command(CompletedCommandOperation),
    Perception {
        events: Vec<CompletedEvent>,
        _reservation: ByteReservation,
    },
}
impl EventBatch {
    fn events(&self) -> impl Iterator<Item = &WorldEvent> + Clone {
        let (ordinary, perception) = match self {
            Self::Event { event, .. } => (std::slice::from_ref(event), &[][..]),
            Self::Command(value) => (value.events.as_slice(), &[][..]),
            Self::Perception { events, .. } => (&[][..], events.as_slice()),
        };
        ordinary
            .iter()
            .chain(perception.iter().map(|value| &value.event))
    }
}
pub(crate) struct CompletedAdvance {
    pub outcome: Outcome,
    pub navigation: Vec<(EntityHandle, PendingRefugeNavigation)>,
    pub continuation: Option<AdvanceContinuation>,
    events: Vec<EventBatch>,
    _reservation: ByteReservation,
}
/// Derived calculation for the exact completed private cut. The public host
/// must bind any accepted continuation to its actual acceptance receipt; a
/// caller cannot attach an old forecast to a different candidate or mutation.
#[derive(Clone)]
pub(crate) struct AdvanceContinuation(Arc<AdvanceSnapshot>);
/// An exact forecast may outlive private undo only after the real fence accepts
/// its cut. Other accepted operations change that cut and invalidate this proof.
pub(crate) struct AcceptedAdvanceContinuation {
    snapshot: AdvanceContinuation,
    accepted: AcceptedCandidate,
}
struct AdvanceSnapshot {
    candidate: CandidateKey,
    installed: Arc<crate::simulation::InstalledWorld>,
    sequence: u64,
    at: f64,
    physical: PhysicalChangeCursor,
    mechanics: MechanicalForecast,
    roster: NativeParticipants,
    _reservation: ByteReservation,
}
impl AdvanceContinuation {
    pub(crate) fn accepted(
        self,
        core: &CoreMutation<'_>,
        accepted: AcceptedCandidate,
    ) -> Result<AcceptedAdvanceContinuation, ExecutionError> {
        if !self.current(core, accepted.key())
            || accepted.key().base_cut.checked_add(1) != Some(core.state.accepted_cut)
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Ok(AcceptedAdvanceContinuation {
            snapshot: self,
            accepted,
        })
    }
    fn current(&self, core: &CoreMutation<'_>, candidate: CandidateKey) -> bool {
        self.0.candidate == candidate
            && Arc::ptr_eq(&self.0.installed, &core.state.installed)
            && self.0.sequence == core.state.physical.header.sequence
            && self.0.at == core.state.physical.header.sim_time
            && core
                .journal
                .physical
                .changes_since(self.0.physical)
                .is_ok_and(|changes| changes.is_empty())
    }
}
impl AcceptedAdvanceContinuation {
    /// Rebase the derived cursor onto a fresh journal, never carry the old
    /// journal's numeric offset into a different operation. Rejection leaves
    /// this accepted preparation available for another genuine candidate.
    pub(crate) fn prepare(
        &self,
        core: &CoreMutation<'_>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Option<AdvanceContinuation>, ExecutionError> {
        let prior = self.accepted.key();
        let snapshot = &self.snapshot.0;
        if prior.base_cut.checked_add(1) != Some(core.state.accepted_cut)
            || candidate.base_cut != core.state.accepted_cut
            || candidate.generation != prior.generation
            || candidate.id <= prior.id
            || !Arc::ptr_eq(&snapshot.installed, &core.state.installed)
            || snapshot.sequence != core.state.physical.header.sequence
            || snapshot.at != core.state.physical.header.sim_time
            || !core.journal.physical.changes().is_empty()
        {
            return Ok(None);
        }
        let reservation = budget.reserve(size_of::<AdvanceSnapshot>() + 2 * size_of::<usize>())?;
        Ok(Some(AdvanceContinuation(Arc::new(AdvanceSnapshot {
            candidate,
            installed: snapshot.installed.clone(),
            sequence: snapshot.sequence,
            at: snapshot.at,
            physical: core.journal.physical.change_cursor(),
            mechanics: snapshot.mechanics.clone(),
            roster: snapshot.roster.clone(),
            _reservation: reservation,
        }))))
    }
}
impl CompletedAdvance {
    pub(crate) fn events(&self) -> impl Iterator<Item = &WorldEvent> + Clone {
        self.events.iter().flat_map(EventBatch::events)
    }
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Begin,
    RemainsStart,
    AppraisalsStart,
    StatusStart,
    ActorCondition,
    ActorPlan,
    ActorAction,
    AnimalClocks,
    WanderEndClocks,
    AnimalChoices,
    SenseStart,
    Predict,
    Steering,
    Move,
    Wander,
    Endpoint,
    StatusEnd,
    Arrival,
    AppraisalsEnd,
    RemainsEnd,
    SenseEnd,
    Continue,
    Flush,
    NativeCommand,
    Publish,
    Done,
}
struct ExpectedEvent {
    id: String,
    order: u64,
    sequence: u64,
    _reservation: ByteReservation,
}
enum NavigationAfter {
    Start,
    Slice,
    Publication,
}
enum EventDestination {
    Reconcile,
    Motion,
    Endpoint,
    Appraisal,
}
enum NativeIntention {
    Route(
        crate::native_refuge::RefugeRoute,
        LocomotionMode,
        ByteReservation,
    ),
    Stop,
}
pub(crate) struct AdvanceCursor {
    candidate: CandidateKey,
    child: Option<CandidateCheckpoint>,
    start_at: f64,
    end_at: f64,
    zero_duration: bool,
    max_intervals: usize,
    intervals: usize,
    motion_slices: usize,
    slices_since_boundary: usize,
    phase: Phase,
    next: usize,
    roster: Option<NativeParticipants>,
    roster_cursor: PhysicalChangeCursor,
    perceivers: Vec<EntityHandle>,
    perceivers_captured: bool,
    preparation: Option<ParticipantPreparation>,
    policies: Option<RoutinePolicyCache>,
    mechanics: Option<MechanicalForecast>,
    pending_seconds: f64,
    pending_rates: Option<(
        Vec<std::sync::Arc<crate::status::StatusRateInterval>>,
        ByteReservation,
    )>,
    seconds: f64,
    input_seconds: f64,
    inputs: Vec<AdmittedWorldInput>,
    steering_preparation: Option<SteeringPreparation>,
    slice_cursor: PhysicalChangeCursor,
    slice_events: usize,
    event_count: usize,
    rates_deferred: bool,
    working: Option<SliceActions>,
    motion: Option<MotionSliceCursor>,
    endpoint: Option<EndpointCursor>,
    endpoint_answer: Option<EndpointAnswer>,
    motion_answer: Option<MoveAdvanceAnswer>,
    reconcile: Option<ReconcileCursor>,
    reconcile_answer: Option<ReconcileAnswer>,
    plan: Option<PlanRunCursor>,
    command: Option<CommandOperation>,
    command_actor: Option<EntityHandle>,
    command_mode: Option<LocomotionMode>,
    queued_movement: Option<(EntityHandle, NativeIntention, Phase)>,
    slice_invalidated: bool,
    boundary_recorded: bool,
    perception_before: Option<(PhysicalChangeCursor, usize)>,
    response: Option<GroundResponseCursor>,
    wander: Option<WanderCursor>,
    choices: Vec<EntityHandle>,
    perception: Option<PerceptionCursor>,
    event: Option<EventCursor>,
    expected: Option<ExpectedEvent>,
    event_destination: Option<EventDestination>,
    events: Vec<EventBatch>,
    navigation: Vec<(EntityHandle, PendingRefugeNavigation)>,
    prepared: Vec<(String, PreparedRefugeNavigation)>,
    flush: Option<Phase>,
    saved_interval: Option<NativeInterval>,
    navigation_blocked: bool,
    navigation_gate: Option<NavigationGate>,
    navigation_after: Option<NavigationAfter>,
    outcome: Option<Outcome>,
    continuation: Option<AdvanceContinuation>,
    reservation: Option<ByteReservation>,
}
fn invalid() -> ExecutionError {
    ExecutionError::UnfinishedOccurrence
}
fn outcome(ok: bool, code: &str, message: impl Into<crate::text::JsText>) -> Outcome {
    Outcome {
        ok,
        code: code.into(),
        message: message.into(),
        spent: None,
        outputs: None,
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}
impl AdvanceCursor {
    fn events(&self) -> impl Iterator<Item = &WorldEvent> + Clone {
        self.events.iter().flat_map(EventBatch::events)
    }
    fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.navigation_gate
            .as_ref()
            .and_then(NavigationGate::question)
            .or_else(|| {
                self.steering_preparation
                    .as_ref()
                    .and_then(SteeringPreparation::question)
            })
            .or_else(|| {
                self.response
                    .as_ref()
                    .and_then(GroundResponseCursor::geometry_request)
            })
            .or_else(|| {
                self.wander
                    .as_ref()
                    .and_then(WanderCursor::geometry_request)
            })
            .or_else(|| {
                self.reconcile
                    .as_ref()
                    .and_then(ReconcileCursor::geometry_request)
            })
            .or_else(|| {
                self.motion
                    .as_ref()
                    .and_then(MotionSliceCursor::geometry_request)
            })
            .or_else(|| {
                self.endpoint
                    .as_ref()
                    .and_then(EndpointCursor::geometry_request)
            })
    }
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        seconds: f64,
        max_intervals: usize,
        candidate: CandidateKey,
        prepared: Vec<(String, PreparedRefugeNavigation)>,
        inputs: Vec<AdmittedWorldInput>,
        continuation: Option<&AdvanceContinuation>,
        budget: &ByteBudget,
    ) -> Result<Self, AdvanceError> {
        // The finite operation result owns only bounded control text.
        let mut reservation = budget.reserve(size_of::<Self>() + 512)?;
        if inputs.iter().any(|input| !input.valid()) {
            return Err(ExecutionError::Invariant.into());
        }
        reservation.resize(
            reservation
                .bytes()
                .checked_add(inputs.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(
                    prepared
                        .capacity()
                        .checked_mul(size_of::<(String, PreparedRefugeNavigation)>())
                        .and_then(|n| {
                            prepared
                                .iter()
                                .try_fold(n, |n, (id, _)| n.checked_add(id.capacity()))
                        })
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let now = core.state.physical.header.sim_time;
        let continuation = continuation.filter(|value| value.current(core, candidate));
        let mut result = Self {
            candidate,
            child: None,
            start_at: now,
            end_at: now + seconds,
            zero_duration: seconds == 0.0,
            max_intervals,
            intervals: 0,
            motion_slices: 0,
            slices_since_boundary: 0,
            phase: Phase::Begin,
            next: 0,
            roster: continuation.map(|value| value.0.roster.clone()),
            roster_cursor: core.journal.physical.change_cursor(),
            perceivers: Vec::new(),
            perceivers_captured: false,
            preparation: None,
            policies: None,
            mechanics: continuation.map(|value| value.0.mechanics.clone()),
            pending_seconds: 0.0,
            pending_rates: None,
            seconds: 0.0,
            input_seconds: 0.0,
            inputs,
            steering_preparation: None,
            slice_cursor: core.journal.physical.change_cursor(),
            slice_events: 0,
            event_count: 0,
            rates_deferred: false,
            working: None,
            motion: None,
            endpoint: None,
            endpoint_answer: None,
            motion_answer: None,
            reconcile: None,
            reconcile_answer: None,
            plan: None,
            command: None,
            command_actor: None,
            command_mode: None,
            queued_movement: None,
            slice_invalidated: false,
            boundary_recorded: false,
            perception_before: None,
            response: None,
            wander: None,
            choices: Vec::new(),
            perception: None,
            event: None,
            expected: None,
            event_destination: None,
            events: Vec::new(),
            navigation: Vec::new(),
            prepared,
            flush: None,
            saved_interval: None,
            navigation_blocked: false,
            navigation_gate: None,
            navigation_after: None,
            outcome: None,
            continuation: continuation.cloned(),
            reservation: Some(reservation),
        };
        if !seconds.is_finite()
            || seconds < 0.0
            || seconds > core.state.installed.time_rules.maximum_advance_seconds()
            || !(1..=4096).contains(&max_intervals)
        {
            let message = core.state.installed.time_rules.invalid_duration_message();
            result.reserve(message.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            result.outcome = Some(outcome(false, "invalid-duration", message.clone()));
            result.phase = Phase::Done;
        } else if core.state.physical.header.paused {
            result.outcome = Some(outcome(true, "paused", "No game time advanced."));
            result.phase = Phase::Done;
        } else {
            result.child = Some(core.journal.checkpoint(core.state)?);
            let initialized = result.begin_navigation_gate(core, NavigationAfter::Start, budget);
            if let Err(error) = initialized {
                result.abort(core)?;
                return Err(error);
            }
        }
        Ok(result)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), AdvanceError> {
        let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
        reservation.resize(
            reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn retain(&mut self, batch: EventBatch) -> Result<(), AdvanceError> {
        if batch.events().next().is_none() {
            return Ok(());
        }
        if self.events.len() == self.events.capacity() {
            self.reserve(size_of::<EventBatch>())?;
            self.events
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        self.event_count = self
            .event_count
            .checked_add(match &batch {
                EventBatch::Perception { events, .. } => events.len(),
                batch => batch.events().count(),
            })
            .ok_or(ExecutionError::Capacity)?;
        self.events.push(batch);
        Ok(())
    }
    fn event_count(&self) -> usize {
        self.event_count
    }
    fn binding(&self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    fn actor<'a>(
        &self,
        core: &'a CoreMutation<'_>,
        handle: EntityHandle,
    ) -> Result<&'a str, ExecutionError> {
        Ok(&core
            .state
            .physical
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingActor)?
            .id)
    }
    fn begin_navigation_gate(
        &mut self,
        core: &CoreMutation<'_>,
        after: NavigationAfter,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        if self.navigation_gate.is_some() || self.navigation_after.is_some() {
            return Err(invalid().into());
        }
        self.navigation_gate = Some(NavigationGate::prepare(core, self.candidate, budget)?);
        self.navigation_after = Some(after);
        Ok(())
    }
    fn begin_scope(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        core.begin_received_value_scope()?;
        core.journal.current.begin_attention_preparation()?;
        self.policies = Some(RoutinePolicyCache::new(
            core.state.installed.clone(),
            budget,
        )?);
        self.saved_interval = core.state.physical.header.native_interval.take();
        if self.mechanics.is_some() {
            self.saved_interval = None;
        }
        Ok(())
    }
    fn stage_event(
        &mut self,
        core: &mut CoreMutation<'_>,
        staged: StagedOccurrence,
        destination: EventDestination,
        budget: &ByteBudget,
    ) -> Result<(), AdvanceError> {
        let reservation = budget.reserve(size_of::<ExpectedEvent>() + staged.id.len())?;
        self.expected = Some(ExpectedEvent {
            id: staged.id.clone(),
            order: staged.order,
            sequence: staged.sequence,
            _reservation: reservation,
        });
        let begun =
            begin_staged_occurrence(core, staged, budget).map_err(CommandOperationError::from)?;
        let binding = self.binding(core)?;
        self.event = Some(
            EventCursor::prepare(
                core,
                begun,
                binding,
                EventAccountPlacement::Immediate,
                budget,
            )
            .map_err(CommandOperationError::from)?,
        );
        self.event_destination = Some(destination);
        Ok(())
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(command) = &mut self.command {
            command.abort(core)?;
        }
        if let Some(plan) = &mut self.plan {
            plan.abort(core)?;
        }
        if let Some(child) = self.child.take() {
            core.journal.rollback_to(core.state, child)?;
        }
        self.phase = Phase::Done;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AdvanceAnswer>,
        budget: &ByteBudget,
    ) -> Result<AdvanceStep<'a>, AdvanceError> {
        let progress = match self.drive(core, answer, budget) {
            Ok(progress) => progress,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::Continue => AdvanceStep::Continue,
            Progress::Geometry => {
                AdvanceStep::Geometry(self.geometry_request().ok_or_else(invalid)?)
            }
            Progress::Collation => {
                AdvanceStep::Collation(self.preparation.as_ref().ok_or_else(invalid)?.request())
            }
            Progress::Event => AdvanceStep::Event(self.event.as_mut().ok_or_else(invalid)?),
            Progress::Plan => AdvanceStep::Plan(self.plan.as_mut().ok_or_else(invalid)?),
            Progress::Command => AdvanceStep::Command(self.command.as_mut().ok_or_else(invalid)?),
            Progress::Perception => {
                AdvanceStep::Perception(self.perception.as_mut().ok_or_else(invalid)?)
            }
            Progress::Complete(value) => AdvanceStep::Complete(value),
        })
    }
}
enum Progress {
    Continue,
    Geometry,
    Collation,
    Event,
    Plan,
    Command,
    Perception,
    Complete(CompletedAdvance),
}
mod drive;
