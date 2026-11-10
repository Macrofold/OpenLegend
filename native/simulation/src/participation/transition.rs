//! Begin-exit, actual absence and actual return share the existing plan,
//! receipt, geometry and event owners. They never replay cold initialization.
use super::*;
use crate::commands::Outcome;
use crate::events::{CompletedEvent, EventAccountPlacement, EventCursor, begin_staged_occurrence};
use crate::execution::{ActionWrite, CoreMutation, ExecutionError, PlanGenerationWrite};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, StandingQuery};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteReservation, CandidateKey};
use crate::plans::{PlanControlCursor, PlanControlKind, PlanControlStep};
use crate::reception::{CompletedPerception, PerceptionCursor};
use crate::state::{Participation, SurfacePoint};
use serde::Deserialize;
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum ParticipationError {
    StaleResponse,
    Execution(ExecutionError),
    Event(crate::events::EventError),
    Emission(crate::events::EmissionError),
    Memory(crate::experience::MemoryAcquisitionError),
    Result(crate::experience::ResultAcquisitionError),
    Reception(crate::reception::ObserverReceptionError),
}
impl From<ExecutionError> for ParticipationError {
    fn from(error: ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<crate::host::CapacityError> for ParticipationError {
    fn from(_: crate::host::CapacityError) -> Self {
        ExecutionError::Capacity.into()
    }
}
impl From<crate::received::ReceivedError> for ParticipationError {
    fn from(error: crate::received::ReceivedError) -> Self {
        ExecutionError::Received(error).into()
    }
}
impl From<crate::events::EventError> for ParticipationError {
    fn from(error: crate::events::EventError) -> Self {
        Self::Event(error)
    }
}
impl From<crate::events::EmissionError> for ParticipationError {
    fn from(error: crate::events::EmissionError) -> Self {
        Self::Emission(error)
    }
}
impl From<crate::experience::MemoryAcquisitionError> for ParticipationError {
    fn from(error: crate::experience::MemoryAcquisitionError) -> Self {
        Self::Memory(error)
    }
}
impl From<crate::experience::ResultAcquisitionError> for ParticipationError {
    fn from(error: crate::experience::ResultAcquisitionError) -> Self {
        Self::Result(error)
    }
}
impl From<crate::reception::ObserverReceptionError> for ParticipationError {
    fn from(error: crate::reception::ObserverReceptionError) -> Self {
        Self::Reception(error)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ParticipationRequest {
    pub actor_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub expected_revision: u64,
    pub operation: ParticipationOperation,
}
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum ParticipationOperation {
    #[serde(rename_all = "camelCase")]
    BeginExit {
        attempt_id: String,
    },
    #[serde(rename_all = "camelCase")]
    ReconcileExit {
        attempt_id: String,
    },
    #[serde(rename_all = "camelCase")]
    Depart {
        attempt_id: String,
    },
    Return,
}
pub(crate) enum ParticipationAnswer {
    Geometry(GeometryAnswers),
    Event(CompletedEvent),
    Perception(CompletedPerception),
}
pub(crate) enum ParticipationStep<'a> {
    Continue,
    Geometry(&'a GeometryQueries),
    Event(&'a mut EventCursor),
    Perception(&'a mut PerceptionCursor),
    Complete(CompletedParticipation),
}
pub(crate) struct CompletedParticipation {
    actor_id: String,
    at: f64,
    deadline: bool,
    pub outcome: Outcome,
    pub events: Vec<crate::events::WorldEvent>,
    pub(super) storage: ByteReservation,
}
impl CompletedParticipation {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub(crate) fn is_deadline(&self, at: f64) -> bool {
        self.deadline && self.at == at && self.outcome.ok
    }
}
#[derive(Clone, Copy, PartialEq)]
enum Phase {
    Validate,
    ReconcileExit,
    ReturnStanding,
    Apply,
    Cancel,
    Discard,
    ClearWork,
    DepartureStanding,
    Depart,
    Returned,
    Initialize,
    Finalize,
    Done,
}
pub(crate) struct ParticipationCursor {
    request: ParticipationRequest,
    candidate: CandidateKey,
    finalize: bool,
    departed: bool,
    phase: Phase,
    queries: Option<GeometryQueries>,
    standing_index: usize,
    anchor: Option<SurfacePoint>,
    control: Option<PlanControlCursor>,
    control_answer: Option<crate::experience::AcquiredActivityResult>,
    event: Option<EventCursor>,
    expected_event: Option<(String, u64, u64)>,
    perception: Option<PerceptionCursor>,
    events: Vec<crate::events::WorldEvent>,
    outcome: Option<Outcome>,
    storage: Option<ByteReservation>,
}
fn invalid() -> ExecutionError {
    ExecutionError::UnfinishedOccurrence
}
impl ParticipationCursor {
    pub(crate) fn new(
        request: ParticipationRequest,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let attempt = match &request.operation {
            ParticipationOperation::BeginExit { attempt_id }
            | ParticipationOperation::ReconcileExit { attempt_id }
            | ParticipationOperation::Depart { attempt_id } => attempt_id.capacity(),
            _ => 0,
        };
        let storage = budget.reserve(
            heap_sum([size_of::<Self>(), request.actor_id.capacity(), attempt])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            request,
            candidate,
            finalize: true,
            departed: false,
            phase: Phase::Validate,
            queries: None,
            standing_index: 0,
            anchor: None,
            control: None,
            control_answer: None,
            event: None,
            expected_event: None,
            perception: None,
            events: Vec::new(),
            outcome: None,
            storage: Some(storage),
        })
    }
    pub(crate) fn due(
        core: &CoreMutation<'_>,
        actor_id: &str,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let actor = core
            .state
            .physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let state = actor
            .participation
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let attempt = state
            .exit_attempt_id
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let _input = budget.reserve(
            actor_id
                .len()
                .checked_add(attempt.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut result = Self::new(
            ParticipationRequest {
                actor_id: actor_id.to_owned(),
                expected_revision: state.revision,
                operation: ParticipationOperation::Depart {
                    attempt_id: attempt.clone(),
                },
            },
            candidate,
            budget,
        )?;
        result.finalize = false;
        Ok(result)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self.storage.as_mut().ok_or_else(invalid)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn outcome(
        &mut self,
        rule: &crate::worlds::InstalledActionMessage,
        ok: bool,
    ) -> Result<(), ExecutionError> {
        self.reserve(
            rule.heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                .checked_mul(4)
                .and_then(|n| n.checked_add(size_of::<Outcome>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.outcome = Some(rule.outcome(ok));
        Ok(())
    }
    fn write(
        &mut self,
        core: &mut CoreMutation<'_>,
        phase: Option<&str>,
        increment: bool,
        attempt: Option<Option<&str>>,
        anchor: Option<&SurfacePoint>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let before = core
            .state
            .physical
            .entities
            .get(&self.request.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .participation
            .as_ref();
        let bytes = heap_sum([
            size_of::<Participation>() + 64,
            before
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?
                .checked_mul(4)
                .ok_or(ExecutionError::Capacity)?,
            phase.map_or(0, str::len) * 4,
            attempt.flatten().map_or(0, str::len) * 4,
            anchor
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?
                * 4,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut next = before.cloned().unwrap_or(Participation {
            phase: "active".to_owned(),
            revision: 0,
            exit_attempt_id: None,
            return_anchor: None,
        });
        if increment {
            next.revision = next
                .revision
                .checked_add(1)
                .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
        }
        if let Some(phase) = phase {
            next.phase = phase.to_owned();
        }
        if let Some(attempt) = attempt {
            next.exit_attempt_id = attempt.map(str::to_owned);
        }
        if let Some(anchor) = anchor {
            next.return_anchor = Some(anchor.clone());
        }
        core.physical()
            .replace_participation(&self.request.actor_id, next, storage)
    }
    fn standing(
        &mut self,
        core: &mut CoreMutation<'_>,
        point: SurfacePoint,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&self.request.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        self.reserve(
            size_of::<StandingQuery>()
                + point.heap_bytes().ok_or(ExecutionError::Capacity)?
                + entity.ordinary_body_profile().id.len(),
        )?;
        let body = entity.body_profile().into_owned();
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let mut queries = GeometryQueries::new(binding);
        queries
            .standing
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        queries.standing.push(StandingQuery { point, body });
        self.queries = Some(queries);
        let _ = budget;
        Ok(())
    }
    fn retain_event(&mut self, value: CompletedEvent) -> Result<(), ExecutionError> {
        let old = self.events.capacity();
        if self.events.len() == old {
            let capacity = old
                .checked_add(1)
                .and_then(usize::checked_next_power_of_two)
                .ok_or(ExecutionError::Capacity)?;
            self.reserve(
                capacity
                    .checked_mul(2 * size_of::<crate::events::WorldEvent>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.events
                .try_reserve_exact(capacity - self.events.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        let CompletedEvent {
            event,
            completed: _,
            awareness,
            reservation,
        } = value;
        drop(awareness);
        self.storage
            .as_mut()
            .ok_or_else(invalid)?
            .merge(reservation)?;
        self.events.push(event);
        Ok(())
    }
    fn emit(
        &mut self,
        core: &mut CoreMutation<'_>,
        returned: bool,
        budget: &ByteBudget,
    ) -> Result<(), ParticipationError> {
        use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
        use crate::narration::{Narration, NarrationPart, PersonRole};
        let installed = core.state.installed.clone();
        let words = &installed.ordinary_actions.value().participation;
        let (event_type, clause) = if returned {
            (&words.returned_event, &words.returned_clause)
        } else {
            (&words.departed_event, &words.departed_clause)
        };
        self.reserve(
            heap_sum([
                event_type.len(),
                clause.len() * 4,
                self.request.actor_id.len() * 4,
                4 * size_of::<NarrationPart>(),
                map_storage::<String, crate::reception::EventScalar>(1)
                    .ok_or(ExecutionError::Capacity)?,
                128,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let text = EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: self.request.actor_id.clone(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(" ".into()),
                NarrationPart::Literal(clause.clone().into()),
            ],
        });
        let staged = core.stage_event(EventEmissionIntent {
            event_type: event_type.clone(),
            text,
            audience: AudienceSelection::Physical,
            source_id: Some(self.request.actor_id.clone()),
            target_id: None,
            data: Some(IndexMap::from([(
                "significant".to_owned(),
                crate::reception::EventScalar::Boolean(true),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(staged.id.len())?;
        self.expected_event = Some((staged.id.clone(), staged.order, staged.sequence));
        let begun = begin_staged_occurrence(core, staged, budget)?;
        let binding = GeometryBinding::new(
            self.candidate,
            installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        self.event = Some(EventCursor::prepare(
            core,
            begun,
            binding,
            EventAccountPlacement::Immediate,
            budget,
        )?);
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ParticipationAnswer>,
        budget: &ByteBudget,
    ) -> Result<ParticipationStep<'a>, ParticipationError> {
        match answer {
            Some(ParticipationAnswer::Geometry(answers)) => {
                let queries = self.queries.as_ref().ok_or_else(invalid)?;
                queries
                    .validate_answers(&answers)
                    .map_err(|_| ParticipationError::StaleResponse)?;
                let queries = self.queries.take().ok_or_else(invalid)?;
                if answers.standing[0] {
                    let point = &queries.standing[0].point;
                    self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    self.anchor = Some(point.clone());
                    self.phase = if self.phase == Phase::ReturnStanding {
                        Phase::Apply
                    } else {
                        Phase::Depart
                    };
                } else {
                    self.standing_index += 1;
                }
            }
            Some(ParticipationAnswer::Event(done)) => {
                let (id, order, sequence) = self.expected_event.take().ok_or_else(invalid)?;
                if done.event.id != id
                    || done.completed.event_id() != id
                    || done.completed.order() != order
                    || done.completed.sequence() != sequence
                {
                    return Err(invalid().into());
                }
                self.retain_event(done)?;
                self.event = None;
            }
            Some(ParticipationAnswer::Perception(done)) => {
                if self.perception.take().is_none() {
                    return Err(invalid().into());
                }
                let (events, policies, vector) = done.into_events()?;
                for event in events {
                    self.retain_event(event)?;
                }
                drop(policies);
                drop(vector);
            }
            None => {}
        }
        if self.queries.is_some() {
            return Ok(ParticipationStep::Geometry(
                self.queries.as_ref().ok_or_else(invalid)?,
            ));
        }
        if self.event.is_some() {
            return Ok(ParticipationStep::Event(
                self.event.as_mut().ok_or_else(invalid)?,
            ));
        }
        if self.perception.is_some() {
            return Ok(ParticipationStep::Perception(
                self.perception.as_mut().ok_or_else(invalid)?,
            ));
        }
        let installed = core.state.installed.clone();
        let words = &installed.ordinary_actions.value().participation;
        loop {
            match self.phase {
                Phase::Validate => {
                    let entity = core.state.physical.entities.get(&self.request.actor_id);
                    let actor = entity.and_then(|entity| entity.actor.as_ref());
                    let state = actor.and_then(|actor| actor.participation.as_ref());
                    if actor.is_none()
                        || state.map_or(0, |state| state.revision) != self.request.expected_revision
                        || self.request.expected_revision == crate::identity::MAX_SAFE_INTEGER
                    {
                        self.outcome(&words.changed_refresh, false)?;
                        self.phase = Phase::Done;
                        continue;
                    }
                    let reconcile_exit = matches!(&self.request.operation,
                        ParticipationOperation::ReconcileExit { attempt_id }
                        if state.is_some_and(|state| state.phase == "exiting"
                            && state.exit_attempt_id.as_ref() != Some(attempt_id)));
                    match &self.request.operation {
                        ParticipationOperation::BeginExit { attempt_id }
                        | ParticipationOperation::ReconcileExit { attempt_id }
                        | ParticipationOperation::Depart { attempt_id }
                            if !crate::values::is_safe_record_id(attempt_id) =>
                        {
                            self.outcome(&words.invalid_attempt, false)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        ParticipationOperation::Depart { attempt_id }
                            if !state.is_some_and(|state| {
                                state.phase == "exiting"
                                    && state.exit_attempt_id.as_ref() == Some(attempt_id)
                            }) =>
                        {
                            self.outcome(&words.stale_attempt, false)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        ParticipationOperation::BeginExit { attempt_id }
                        | ParticipationOperation::ReconcileExit { attempt_id }
                            if state.is_some_and(|state| state.phase != "active")
                                && !reconcile_exit =>
                        {
                            if state.is_some_and(|state| {
                                state.exit_attempt_id.as_ref() == Some(attempt_id)
                            }) {
                                self.outcome(&words.already_pending, true)?;
                            } else {
                                self.outcome(&words.changed, false)?;
                            }
                            self.phase = Phase::Done;
                            continue;
                        }
                        ParticipationOperation::Return
                            if state.is_none_or(|state| state.phase == "active") =>
                        {
                            self.outcome(&words.already_participating, true)?;
                            self.phase = Phase::Done;
                            continue;
                        }
                        _ => {}
                    }
                    let entity = entity.ok_or(ExecutionError::MissingEntity)?;
                    if entity.spatial.local_pose.is_some()
                        || entity.spatial.flight.is_some()
                        || actor.is_some_and(|actor| actor.encounters.is_some())
                    {
                        return Err(ExecutionError::UnsupportedFamily.into());
                    }
                    self.phase = if reconcile_exit {
                        Phase::ReconcileExit
                    } else if matches!(self.request.operation, ParticipationOperation::Return)
                        && state.is_some_and(|state| state.phase == "inactive")
                        && actor.is_some_and(|actor| actor.pending_death.is_none())
                    {
                        Phase::ReturnStanding
                    } else {
                        Phase::Apply
                    };
                }
                Phase::ReconcileExit => {
                    // Source's operational absence reconciliation first adopts
                    // the current auth_exits attempt without spending a gameplay
                    // revision. The ordinary begin-exit below then owns effects.
                    self.write(core, Some("active"), false, Some(None), None, budget)?;
                    // Exiting and active have identical Source exposure and
                    // receiver keys; this reset queues no sensory invalidation.
                    self.phase = Phase::Apply;
                }
                Phase::ReturnStanding => {
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.request.actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
                    let saved = actor
                        .participation
                        .as_ref()
                        .and_then(|state| state.return_anchor.as_ref());
                    let supported = entity.supported_position();
                    let point = if self.standing_index == 0 {
                        saved.or(supported.as_ref())
                    } else if self.standing_index == 1 {
                        installed
                            .retained
                            .participation_read
                            .as_ref()
                            .and_then(|policy| policy.safe_return_anchor.as_ref())
                    } else {
                        None
                    };
                    if let Some(point) = point {
                        let _copy =
                            budget.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                        let point = point.clone();
                        self.standing(core, point, budget)?;
                        return Ok(ParticipationStep::Geometry(
                            self.queries.as_ref().ok_or_else(invalid)?,
                        ));
                    }
                    if self.standing_index == 0 {
                        self.standing_index = 1;
                        continue;
                    }
                    self.outcome(&words.unsafe_return, false)?;
                    self.phase = Phase::Done;
                }
                Phase::Apply => {
                    // The public transition records this semantic cause before
                    // work. A simulated deadline records it after departure.
                    self.write(core, None, true, None, None, budget)?;
                    if self.finalize {
                        core.physical()
                            .participation_changed(&self.request.actor_id)?;
                        core.sync_sensory_changes()?;
                    }
                    match &self.request.operation {
                        ParticipationOperation::BeginExit { attempt_id }
                        | ParticipationOperation::ReconcileExit { attempt_id } => {
                            let _copy = budget.reserve(attempt_id.len())?;
                            let attempt = attempt_id.clone();
                            self.write(
                                core,
                                Some("exiting"),
                                false,
                                Some(Some(&attempt)),
                                None,
                                budget,
                            )?;
                            if let Some(exposure) = installed
                                .retained
                                .participation_read
                                .as_ref()
                                .and_then(|policy| policy.exit_exposure_seconds)
                            {
                                let deadline = core.state.physical.header.sim_time + exposure;
                                core.physical()
                                    .set_exit_exposure(&self.request.actor_id, Some(deadline))?;
                                self.phase = Phase::Cancel;
                            } else {
                                self.phase = Phase::Finalize;
                            }
                        }
                        ParticipationOperation::Depart { .. } => self.phase = Phase::Cancel,
                        ParticipationOperation::Return => {
                            if let Some(point) = &self.anchor {
                                let _copy = budget.reserve(point.surface_id.len())?;
                                core.physical().set_position(
                                    &self.request.actor_id,
                                    crate::state::Point {
                                        x: point.x,
                                        y: point.y,
                                        z: point.z,
                                    },
                                    Some(point.surface_id.clone()),
                                    None,
                                )?;
                                core.physical()
                                    .clear_participation_fall(&self.request.actor_id)?;
                            }
                            let inactive = core
                                .state
                                .physical
                                .entities
                                .get(&self.request.actor_id)
                                .and_then(|entity| entity.actor.as_ref())
                                .and_then(|actor| actor.participation.as_ref())
                                .is_some_and(|state| state.phase == "inactive");
                            self.write(core, Some("active"), false, Some(None), None, budget)?;
                            core.physical()
                                .set_exit_exposure(&self.request.actor_id, None)?;
                            self.phase = if inactive {
                                Phase::Returned
                            } else {
                                Phase::Finalize
                            };
                        }
                    }
                }
                Phase::Cancel | Phase::Discard => {
                    if self.control.is_none() {
                        self.control = Some(PlanControlCursor::new(
                            &self.request.actor_id,
                            if self.phase == Phase::Cancel {
                                PlanControlKind::Cancel
                            } else {
                                PlanControlKind::DiscardSuspended
                            },
                            budget,
                        )?);
                    }
                    match self
                        .control
                        .as_mut()
                        .ok_or_else(invalid)?
                        .step(core, self.control_answer.take())?
                    {
                        PlanControlStep::Personal(pending) => {
                            let plan =
                                crate::experience::prepare_activity_result(core, pending, budget)?;
                            self.control_answer = Some(crate::experience::acquire_activity_result(
                                core,
                                plan,
                                &installed.schema,
                            )?);
                        }
                        PlanControlStep::Complete => {
                            self.control = None;
                            self.phase = if self.phase == Phase::Cancel {
                                Phase::Discard
                            } else {
                                Phase::ClearWork
                            };
                        }
                    }
                }
                Phase::ClearWork => {
                    // ClosedInventory proves the actual resource-reservation
                    // owner is complete and empty; these selected actions
                    // cannot create held resources. No release is fabricated.
                    let id = &self.request.actor_id;
                    core.physical().replace_action(
                        id,
                        None,
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: None,
                        },
                    )?;
                    for definition in &installed.status_policy.definitions {
                        if !definition.occupies_action {
                            continue;
                        }
                        let source = core
                            .state
                            .physical
                            .entities
                            .get(id)
                            .and_then(|entity| entity.status_effects.as_ref())
                            .and_then(|statuses| statuses.get(&definition.id));
                        if let Some(source) = source.filter(|status| status.active) {
                            // Releasing an episode first materializes its
                            // earned values. Copy that resulting instance,
                            // rather than restoring its earlier fields.
                            let _episode = budget.reserve(source.episode.len())?;
                            let episode = source.episode.clone();
                            core.physical().release_work(&episode)?;
                            let source = core
                                .state
                                .physical
                                .entities
                                .get(id)
                                .and_then(|entity| entity.status_effects.as_ref())
                                .and_then(|statuses| statuses.get(&definition.id))
                                .ok_or(ExecutionError::Invariant)?;
                            let mut after = crate::state::FundedStatus::copy(source, budget)?;
                            after.value.active = false;
                            core.physical().replace_status(id, &definition.id, after)?;
                        }
                    }
                    self.phase = if matches!(
                        self.request.operation,
                        ParticipationOperation::Depart { .. }
                    ) {
                        Phase::DepartureStanding
                    } else {
                        Phase::Finalize
                    };
                }
                Phase::DepartureStanding => {
                    let point = core
                        .state
                        .physical
                        .entities
                        .get(&self.request.actor_id)
                        .ok_or(ExecutionError::MissingActor)?
                        .supported_position();
                    if self.standing_index == 0
                        && let Some(point) = point
                    {
                        self.standing(core, point, budget)?;
                        return Ok(ParticipationStep::Geometry(
                            self.queries.as_ref().ok_or_else(invalid)?,
                        ));
                    }
                    self.phase = Phase::Depart;
                }
                Phase::Depart => {
                    self.departed = true;
                    let _anchor = budget.reserve(
                        self.anchor
                            .as_ref()
                            .map_or(Some(0), HeapBytes::heap_bytes)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let anchor = self.anchor.clone();
                    self.write(core, Some("inactive"), false, None, anchor.as_ref(), budget)?;
                    let handle = core
                        .state
                        .physical
                        .entities
                        .handle(&self.request.actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    core.physical().set_sensory_progress(handle, None)?;
                    crate::reception::depart_receiving(core, &self.request.actor_id, budget)?;
                    core.physical()
                        .set_exit_exposure(&self.request.actor_id, None)?;
                    self.phase = Phase::Finalize;
                    self.emit(core, false, budget)?;
                    return Ok(ParticipationStep::Event(
                        self.event.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Phase::Returned => {
                    let handle = core
                        .state
                        .physical
                        .entities
                        .handle(&self.request.actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    core.physical().set_sensory_progress(handle, None)?;
                    self.phase = Phase::Initialize;
                    self.emit(core, true, budget)?;
                    return Ok(ParticipationStep::Event(
                        self.event.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Phase::Initialize => {
                    let handle = core
                        .state
                        .physical
                        .entities
                        .handle(&self.request.actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    self.phase = Phase::Finalize;
                    self.perception = Some(PerceptionCursor::initialize_selected(
                        core,
                        &[handle],
                        self.candidate,
                        budget,
                    )?);
                    return Ok(ParticipationStep::Perception(
                        self.perception.as_mut().ok_or_else(invalid)?,
                    ));
                }
                Phase::Finalize => {
                    if self.finalize {
                        core.physical().reconcile_closed_coaching()?;
                        crate::experience::advance_commitments(core, &self.events, budget)?;
                        core.state.physical.header.native_interval = None;
                        core.state.physical.header.sequence = core
                            .state
                            .physical
                            .header
                            .sequence
                            .checked_add(1)
                            .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
                            .ok_or(ExecutionError::Identity)?;
                        // Source final publication reconciles the character
                        // whose action/plan was interrupted, including sleep.
                        core.physical()
                            .reconcile_semantic_interval(&self.request.actor_id)?;
                    } else {
                        core.physical()
                            .participation_changed(&self.request.actor_id)?;
                    }
                    core.sync_sensory_changes()?;
                    if self.departed && self.finalize {
                        publish_departure_audit(core, &self.request.actor_id, budget)?;
                    }
                    let phase = core
                        .state
                        .physical
                        .entities
                        .get(&self.request.actor_id)
                        .and_then(|entity| entity.actor.as_ref())
                        .and_then(|actor| actor.participation.as_ref())
                        .ok_or(ExecutionError::Invariant)?
                        .phase
                        .as_str();
                    self.outcome(
                        match phase {
                            "active" => &words.active,
                            "exiting" => &words.exiting,
                            "inactive" => &words.inactive,
                            _ => return Err(ExecutionError::Invariant.into()),
                        },
                        true,
                    )?;
                    self.phase = Phase::Done;
                }
                Phase::Done => {
                    return Ok(ParticipationStep::Complete(CompletedParticipation {
                        actor_id: std::mem::take(&mut self.request.actor_id),
                        at: core.state.physical.header.sim_time,
                        deadline: !self.finalize,
                        outcome: self.outcome.take().ok_or_else(invalid)?,
                        events: std::mem::take(&mut self.events),
                        storage: self.storage.take().ok_or_else(invalid)?,
                    }));
                }
            }
        }
    }
}

/// Source's completed exposure-cache audit observes absence only at the outer
/// publication. Elapsed sensing consumes its due-exit change itself, so its
/// child does not add another notice before or after that actual reception.
fn publish_departure_audit(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let _notice = budget.reserve(actor_id.len() + size_of::<crate::execution::PhysicalChange>())?;
    let point = core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.world_position())
        .ok_or(ExecutionError::MissingBody)?;
    core.journal
        .sensory
        .queue_physical_change(
            &mut core.state.reception,
            core.state.physical.header.sim_time,
            &crate::execution::PhysicalChange::Spatial {
                entity_id: actor_id.to_owned(),
                before: point,
                after: point,
                support_unchanged: true,
                discontinuity: false,
            },
            core.state.installed.maximum_change_scopes,
        )
        .map_err(ExecutionError::from)
}
