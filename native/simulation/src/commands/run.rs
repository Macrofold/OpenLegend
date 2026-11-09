//! One command's actual continuation inside its caller's candidate checkpoint.
//! Geometry is finite provider data; occurrences and personal results are
//! resumed only with proofs from their real native semantic owners.

use super::*;
use crate::activity::{ActivityView, PendingActivityResult};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionWrite, CoreMutation, ExecutionError, PendingStatusEnd, PlanGenerationWrite,
    StagedOccurrence, StatusActivationAnswer, StatusActivationCursor, StatusActivationProgress,
    StatusEnd,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, StandingQuery,
    SupportQuery, WalkingSegment,
};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::state::{Action, NavigationPending, SurfacePoint};
use crate::work::{MeterToken, WorkUnit};

pub(crate) struct NativeMovementInput {
    pub binding: crate::native_response::NativeLocomotion,
    pub route: crate::native_refuge::RefugeRoute,
}
pub(crate) struct CommandOptions {
    pub native_controller: bool,
    pub native_movement: Option<NativeMovementInput>,
}
pub(crate) enum CommandAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
    EvidenceEnded(crate::reception::EndedCurrentEvidence),
    Display(super::CompletedActivityDisplay),
}
pub(crate) enum CommandStep<'a> {
    Geometry(&'a GeometryQueries),
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    EndEvidence {
        observer_id: &'a str,
        physical_life: u64,
        at: f64,
    },
    Display(&'a mut super::ActivityDisplayCursor),
    Complete(super::PendingCommandCompletion),
}
enum Progress {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    EndEvidence,
    Display,
    Complete(super::PendingCommandCompletion),
}
#[derive(Clone, Copy)]
enum Phase {
    Start,
    Support,
    Standing,
    Route,
    Probe,
    Prepared,
    RecordPrepared,
    RecordStatus,
    RecordSpeech,
    Interrupt,
    Replace,
    Install,
    AfterDeparture,
    CancelEnd,
    CancelClear,
    Deactivate,
    StatusSight,
    StatusReach,
    StatusApply,
    StatusFacts,
    Speech,
    ImmediateResult,
    Tail,
    Conditions,
    Done,
}
enum PersonalTask {
    Replaced(PendingActivityResult),
    Status(PendingStatusEnd),
    Immediate(PendingActivityResult),
}
impl PersonalTask {
    fn result(&self) -> &PendingActivityResult {
        match self {
            Self::Replaced(p) | Self::Immediate(p) => p,
            Self::Status(p) => p.personal(),
        }
    }
}
pub(crate) struct CommandCursor {
    command: NativeCommand,
    canonical: String,
    view: Option<ActivityView>,
    view_reservation: Option<ByteReservation>,
    display: Option<super::ActivityDisplayCursor>,
    prepared_speech: Option<EventEmissionIntent>,
    before_action_id: Option<String>,
    chosen_work_done: bool,
    source_scope_started: bool,
    conditions: Option<crate::conditions::ConditionReconcileCursor>,
    exposure: Option<super::exposure::CommandExposure>,
    options: CommandOptions,
    phase: Phase,
    queries: Option<GeometryQueries>,
    binding: GeometryBinding,
    resolved: Option<SurfacePoint>,
    action: Option<Action>,
    action_storage: Option<ByteReservation>,
    activity_id: Option<String>,
    interrupt_at: usize,
    personal: Option<PersonalTask>,
    event: Option<String>,
    after_event: Phase,
    pending_release: Option<String>,
    sight: Option<crate::reception::SightBatch>,
    status_was_active: bool,
    activation: Option<StatusActivationCursor>,
    budget: ByteBudget,
    outcome: Option<Outcome>,
    meter: Option<MeterToken>,
    duplicate: bool,
    finalize: bool,
    materialized: bool,
    _reservation: ByteReservation,
}
fn outcome(ok: bool, code: &str, message: &str) -> Outcome {
    Outcome {
        spent: None,
        outputs: None,
        ok,
        code: code.to_owned(),
        message: message.into(),
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}
impl CommandCursor {
    /// Canonical command bytes come from the existing Node canonicalJson input
    /// encoder. They are the current receipt's digest, not a writable world.
    pub(crate) fn new(
        command: NativeCommand,
        canonical: String,
        options: CommandOptions,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let decoded: NativeCommand =
            serde_json::from_str(&canonical).map_err(|_| ExecutionError::Invariant)?;
        if decoded != command {
            return Err(ExecutionError::Invariant);
        }
        let bytes = std::mem::size_of::<Self>()
            + canonical.capacity()
            + command.heap_bytes().ok_or(ExecutionError::Capacity)?
            + options
                .native_movement
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            command,
            canonical,
            view: None,
            view_reservation: None,
            display: None,
            prepared_speech: None,
            before_action_id: None,
            chosen_work_done: false,
            source_scope_started: false,
            conditions: None,
            exposure: None,
            options,
            phase: Phase::Start,
            queries: None,
            binding,
            resolved: None,
            action: None,
            action_storage: None,
            activity_id: None,
            interrupt_at: 0,
            personal: None,
            event: None,
            after_event: Phase::Tail,
            pending_release: None,
            sight: None,
            status_was_active: false,
            activation: None,
            budget: budget.clone(),
            outcome: None,
            meter: None,
            duplicate: false,
            finalize: false,
            materialized: false,
            _reservation: reservation,
        })
    }
    pub(super) fn display_cursor(&mut self) -> Option<&mut super::ActivityDisplayCursor> {
        self.display.as_mut()
    }
    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.sight
            .as_ref()
            .map(|sight| sight.queries())
            .or(self.queries.as_ref())
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.command.envelope().actor_id
    }
    /// The coordinator calls this on an operational error before rolling back
    /// its command checkpoint. Operational work already spent is never refunded.
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(meter) = self.meter.take() {
            core.journal.meters.finish(meter)?;
        }
        self.display = None;
        self.view = None;
        self.view_reservation = None;
        self.prepared_speech = None;
        self.conditions = None;
        self.exposure = None;
        Ok(())
    }
    fn begin_chosen_work(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if self.chosen_work_done {
            return Ok(());
        }
        self.chosen_work_done = true;
        if self.options.native_controller || self.outcome.as_ref().is_none_or(|outcome| !outcome.ok)
        {
            return Ok(());
        }
        let actor_id = &self.command.envelope().actor_id;
        let action = core
            .state
            .physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref());
        let Some(action) =
            action.filter(|action| self.before_action_id.as_deref() != Some(action.id.as_str()))
        else {
            return Ok(());
        };
        let _name = self.budget.reserve(action.id.len())?;
        let action_id = action.id.clone();
        core.physical().begin_semantic_work(actor_id, &action_id)
    }
    fn begin_source_scope(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if !self.source_scope_started {
            core.begin_received_value_scope()?;
            self.source_scope_started = true;
        }
        Ok(())
    }
    fn needs_display(&mut self, core: &mut CoreMutation<'_>) -> Result<bool, ExecutionError> {
        if self.options.native_controller || self.view.is_some() {
            return Ok(false);
        }
        if self.display.is_none() {
            let candidate = crate::host::CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.base_cut,
                generation: self.binding.generation,
            };
            self.display = Some(super::ActivityDisplayCursor::prepare(
                core,
                &self.command,
                candidate,
                &self.budget,
            )?);
        }
        Ok(true)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn grow_action_storage(&mut self, extra: usize) -> Result<(), ExecutionError> {
        let storage = self
            .action_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(extra)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn size_action_storage(&mut self) -> Result<(), ExecutionError> {
        let bytes = self
            .action
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        self.action_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .resize(bytes)?;
        Ok(())
    }
    fn refuse(&mut self, message: &crate::worlds::InstalledActionMessage) {
        self.outcome = Some(message.outcome(false));
        self.phase = Phase::Done;
    }
    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
        phase: Phase,
    ) -> Result<&mut GeometryQueries, ExecutionError> {
        self.binding.serial = core.journal.next_provider_serial()?;
        self.queries = Some(GeometryQueries::new(self.binding));
        self.phase = phase;
        self.queries.as_mut().ok_or(ExecutionError::Invariant)
    }
    fn complete_status(
        &mut self,
        status: StatusEnd,
        next: Phase,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        match status {
            StatusEnd::Unchanged | StatusEnd::Complete => {
                self.phase = next;
                Ok(None)
            }
            StatusEnd::Occurrence(event) => {
                self.reserve(event.id.len())?;
                self.event = Some(event.id.clone());
                self.after_event = next;
                Ok(Some(event))
            }
            StatusEnd::Personal(pending) => {
                self.personal = Some(PersonalTask::Status(pending));
                self.after_event = next;
                Ok(None)
            }
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<CommandStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            Progress::Geometry => CommandStep::Geometry(if let Some(sight) = &self.sight {
                sight.queries()
            } else {
                self.queries.as_ref().ok_or(ExecutionError::Invariant)?
            }),
            Progress::Personal => CommandStep::Personal(if let Some(pending) = &self.personal {
                pending.result()
            } else {
                self.activation
                    .as_ref()
                    .and_then(StatusActivationCursor::personal)
                    .ok_or(ExecutionError::Invariant)?
            }),
            Progress::EndEvidence => {
                let (observer_id, physical_life, at) = self
                    .activation
                    .as_ref()
                    .and_then(StatusActivationCursor::evidence_end)
                    .ok_or(ExecutionError::Invariant)?;
                CommandStep::EndEvidence {
                    observer_id,
                    physical_life,
                    at,
                }
            }
            Progress::Occurrence(event) => CommandStep::Occurrence(event),
            Progress::Display => {
                CommandStep::Display(self.display.as_mut().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(result) => CommandStep::Complete(result),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        let mut answer = answer;
        if self.activation.is_none() && self.conditions.is_none() {
            if let Some(answer) = answer.take() {
                match answer {
                    CommandAnswer::Display(completed) => {
                        if self.display.is_none() || self.view.is_some() {
                            return Err(ExecutionError::Invariant);
                        }
                        let (view, reservation) = completed.into_view(&self.command)?;
                        self.view = Some(view);
                        self.view_reservation = Some(reservation);
                        self.display = None;
                    }
                    CommandAnswer::Occurrence(completed) => {
                        if self.event.as_deref() != Some(completed.event_id()) {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        self.event = None;
                        self.phase = self.after_event;
                    }
                    CommandAnswer::EvidenceEnded(_) => {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    CommandAnswer::Personal(acquired) => {
                        let task = self
                            .personal
                            .take()
                            .ok_or(ExecutionError::UnfinishedOccurrence)?;
                        match task {
                            PersonalTask::Replaced(pending) => {
                                core.complete_activity_result(pending, &acquired)?;
                                if let Some(old) = self.pending_release.take() {
                                    core.physical().release_work(&old)?;
                                }
                                self.phase = if matches!(self.command, NativeCommand::Cancel { .. })
                                {
                                    Phase::CancelClear
                                } else {
                                    Phase::Install
                                };
                            }
                            PersonalTask::Immediate(pending) => {
                                core.complete_activity_result(pending, &acquired)?;
                                self.phase = Phase::Tail;
                            }
                            PersonalTask::Status(pending) => {
                                let status = pending.resume(core, &acquired)?;
                                if let Some(event) =
                                    self.complete_status(status, self.after_event)?
                                {
                                    return Ok(Progress::Occurrence(event));
                                }
                            }
                        }
                    }
                    CommandAnswer::Geometry(mut answer) => {
                        if matches!(self.phase, Phase::StatusSight) {
                            let sight = self
                                .sight
                                .take()
                                .ok_or(ExecutionError::Invariant)?
                                .finish(answer)
                                .map_err(|_| ExecutionError::Invariant)?;
                            let NativeCommand::StatusEffect { target_id, .. } = &self.command
                            else {
                                return Err(ExecutionError::Invariant);
                            };
                            if sight.seen(target_id) != Some(true) {
                                self.refuse(&ordinary.out_of_reach);
                            } else {
                                self.phase = Phase::StatusReach;
                            }
                            return self.drive(core, None);
                        }
                        self.queries
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .validate_answers(&answer)
                            .map_err(|_| ExecutionError::Invariant)?;
                        match self.phase {
                            Phase::Support => {
                                let Some(point) =
                                    answer.support.pop().ok_or(ExecutionError::Invariant)?
                                else {
                                    self.refuse(&ordinary.blocked);
                                    return self.drive(core, None);
                                };
                                self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                                self.resolved = Some(point);
                                self.phase = Phase::Standing;
                                self.queries = None;
                            }
                            Phase::Standing => {
                                if !answer.standing.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.blocked);
                                } else {
                                    self.phase = Phase::Route;
                                }
                                self.queries = None;
                            }
                            Phase::Route => {
                                let route = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
                                let crate::geometry::GuardedRoutePlan(route, storage) =
                                    crate::geometry::route_plan(route, &self.budget)?;
                                self.action_storage
                                    .as_mut()
                                    .ok_or(ExecutionError::Invariant)?
                                    .merge(storage)?;
                                let action =
                                    self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                                match route {
                                    RoutePlan::Reached { path, .. } => {
                                        action.path = path;
                                        action.stage = "approaching".to_owned();
                                    }
                                    RoutePlan::Pending { request, .. } => {
                                        action.stage = "approaching".to_owned();
                                        action.navigation = Some(NavigationPending {
                                            request,
                                            failure: None,
                                        });
                                    }
                                    RoutePlan::InvalidEndpoint { .. } => {
                                        self.outcome = Some(outcome(
                                            false,
                                            "invalid-endpoint",
                                            &ordinary.no_route.message,
                                        ));
                                        self.phase = Phase::Done;
                                    }
                                    RoutePlan::NoRoute { .. } => self.refuse(&ordinary.no_route),
                                    RoutePlan::BudgetExceeded { .. } => {
                                        self.refuse(&ordinary.budget_exceeded)
                                    }
                                }
                                if !matches!(self.phase, Phase::Done) {
                                    self.size_action_storage()?;
                                    self.phase = Phase::Prepared;
                                }
                                self.queries = None;
                            }
                            Phase::StatusReach => {
                                if !answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.out_of_reach);
                                } else {
                                    self.phase = Phase::StatusApply;
                                }
                                self.queries = None;
                            }
                            Phase::Probe => {
                                if !answer.walking.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.unreachable);
                                } else {
                                    let point_bytes = self
                                        .resolved
                                        .as_ref()
                                        .ok_or(ExecutionError::Invariant)?
                                        .heap_bytes()
                                        .ok_or(ExecutionError::Capacity)?;
                                    self.grow_action_storage(
                                        std::mem::size_of::<SurfacePoint>()
                                            .checked_add(point_bytes)
                                            .and_then(|n| n.checked_add("approaching".len()))
                                            .ok_or(ExecutionError::Capacity)?,
                                    )?;
                                    let action =
                                        self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                                    action.stage = "approaching".to_owned();
                                    action.path = vec![
                                        self.resolved
                                            .as_ref()
                                            .ok_or(ExecutionError::Invariant)?
                                            .clone(),
                                    ];
                                    self.size_action_storage()?;
                                    self.phase = Phase::Prepared;
                                }
                                self.queries = None;
                            }
                            _ => return Err(ExecutionError::Invariant),
                        }
                    }
                }
            } else if self.event.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            if let Some(conditions) = self.conditions.as_mut() {
                let completed = match answer.take() {
                    Some(CommandAnswer::Occurrence(completed)) => Some(completed),
                    None => None,
                    Some(_) => return Err(ExecutionError::UnfinishedOccurrence),
                };
                match conditions.step(core, completed)? {
                    crate::conditions::ConditionReconcileStep::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    crate::conditions::ConditionReconcileStep::Complete => {
                        self.conditions = None;
                        self.phase = Phase::Done;
                        continue;
                    }
                }
            }
            if let Some(activation) = self.activation.as_mut() {
                let supplied = answer
                    .take()
                    .map(|answer| match answer {
                        CommandAnswer::Personal(value) => {
                            Ok(StatusActivationAnswer::Personal(value))
                        }
                        CommandAnswer::Occurrence(value) => {
                            Ok(StatusActivationAnswer::Occurrence(value))
                        }
                        CommandAnswer::EvidenceEnded(value) => {
                            Ok(StatusActivationAnswer::EvidenceEnded(value))
                        }
                        CommandAnswer::Geometry(_) | CommandAnswer::Display(_) => {
                            Err(ExecutionError::UnfinishedOccurrence)
                        }
                    })
                    .transpose()?;
                match activation.drive(core, supplied)? {
                    StatusActivationProgress::Personal => return Ok(Progress::Personal),
                    StatusActivationProgress::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    StatusActivationProgress::EndEvidence => return Ok(Progress::EndEvidence),
                    StatusActivationProgress::Complete(accepted) => {
                        self.activation = None;
                        if accepted {
                            self.phase = Phase::StatusFacts;
                        } else {
                            self.refuse(&ordinary.not_applicable);
                        }
                        continue;
                    }
                }
            }
            if self.personal.is_some() {
                return Ok(Progress::Personal);
            }
            let actor_id = self.command.envelope().actor_id.clone();
            match self.phase {
                Phase::Start => {
                    let prior = core
                        .state
                        .physical
                        .entities
                        .get(self.actor_id())
                        .and_then(|entity| entity.actor.as_ref())
                        .and_then(|actor| actor.action.as_ref());
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(prior.map_or(0, |action| action.id.len()))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.before_action_id = prior.map(|action| action.id.clone());

                    // At most the current result and its immediate personal
                    // completion copy coexist here. Other owners fund their
                    // own history/receipt before-images before cloning them.
                    self.reserve(
                        ordinary
                            .maximum_message_bytes()
                            .and_then(|n| n.checked_mul(2))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let meter = core
                        .journal
                        .meters
                        .begin(core.state.installed.work_policy.policy().group)?;
                    self.meter = Some(meter);
                    let input_bytes = u64::try_from(self.canonical.encode_utf16().count())
                        .ok()
                        .and_then(|n| n.checked_mul(3))
                        .ok_or(ExecutionError::Capacity)?;
                    core.journal
                        .meters
                        .charge(&[(WorkUnit::InputBytes, input_bytes)])?;
                    if !self.options.native_controller {
                        if let Some(record) = core.state.commands.get(&self.command.envelope().id) {
                            if record.receipt.digest == self.canonical {
                                self.reserve(
                                    record
                                        .receipt
                                        .outcome
                                        .heap_bytes()
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                let mut result = record.receipt.outcome.clone();
                                result.code = "duplicate".to_owned();
                                self.outcome = Some(result);
                                self.duplicate = true;
                                self.phase = Phase::Done;
                                continue;
                            }
                            self.refuse(&ordinary.idempotency_conflict);
                            continue;
                        }
                    }
                    if let Some(problem) =
                        actor_problem(core, &self.command, self.options.native_controller)?
                    {
                        self.outcome = Some(problem);
                        self.phase = Phase::Done;
                        continue;
                    }
                    match &self.command {
                        NativeCommand::Move { destination, .. } => {
                            if ![destination.x, destination.y, destination.z]
                                .iter()
                                .all(|n| n.is_finite())
                            {
                                self.refuse(&ordinary.blocked);
                                continue;
                            }
                            let actor = core
                                .state
                                .physical
                                .entities
                                .get(&actor_id)
                                .ok_or(ExecutionError::MissingActor)?;
                            if crate::reception::vision_parameters(&core.state.installed, actor)
                                .radius
                                == 0.0
                                && crate::spatial::distance(
                                    actor
                                        .world_position()
                                        .ok_or(ExecutionError::InvalidPosition)?,
                                    destination.point(),
                                ) > 1.0
                            {
                                self.refuse(&ordinary.unsupported_navigation);
                                continue;
                            }
                            let point = destination.point();
                            let surface_id = destination.surface_id.clone();
                            self.question(core, Phase::Support)?
                                .support
                                .push(SupportQuery {
                                    point,
                                    surface_id: Some(surface_id),
                                });
                            return Ok(Progress::Geometry);
                        }
                        NativeCommand::Cancel {
                            expected_action_id, ..
                        } => {
                            let current = core
                                .state
                                .physical
                                .entities
                                .get(&actor_id)
                                .and_then(|e| e.actor.as_ref())
                                .and_then(|a| a.action.as_ref());
                            if expected_action_id
                                .as_ref()
                                .is_some_and(|expected| current.is_none_or(|a| &a.id != expected))
                            {
                                self.refuse(&ordinary.stale_action);
                                continue;
                            }
                            self.phase = Phase::Interrupt;
                        }
                        NativeCommand::StatusEffect { .. } => self.phase = Phase::Deactivate,
                        NativeCommand::Say { .. } => self.phase = Phase::Speech,
                    }
                }
                Phase::Standing => {
                    let body = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?
                        .body_profile()
                        .into_owned();
                    let point = self
                        .resolved
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone();
                    self.question(core, Phase::Standing)?
                        .standing
                        .push(StandingQuery { point, body });
                    return Ok(Progress::Geometry);
                }
                Phase::Route => {
                    let NativeCommand::Move { destination, .. } = &self.command else {
                        return Err(ExecutionError::Invariant);
                    };
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let from = actor
                        .supported_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let in_reach = from.surface_id == destination.surface_id
                        && crate::spatial::distance(from.point(), destination.point())
                            <= core.state.installed.movement_settings.arrival_tolerance;
                    // This storage follows the actual pending action into its
                    // entity slot; a cursor's own guard cannot fund accepted buffers.
                    let base_bytes = self
                        .command
                        .envelope()
                        .id
                        .len()
                        .checked_add(destination.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .and_then(|n| n.checked_add("move".len() + "approaching".len()))
                        .ok_or(ExecutionError::Capacity)?;
                    self.action_storage = Some(self.budget.reserve(base_bytes)?);
                    let action = Action::movement(
                        self.command.envelope().id.clone(),
                        destination.clone(),
                        Vec::new(),
                        !in_reach,
                        None,
                        None,
                    );
                    self.action = Some(action);
                    if in_reach {
                        self.phase = Phase::Prepared;
                        continue;
                    }
                    if self.options.native_movement.is_some() {
                        let path_bytes = self
                            .options
                            .native_movement
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .route
                            .path
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?;
                        self.grow_action_storage(path_bytes)?;
                        let native = self
                            .options
                            .native_movement
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?;
                        self.action.as_mut().ok_or(ExecutionError::Invariant)?.path =
                            native.route.path.clone();
                        self.phase = Phase::Prepared;
                        continue;
                    }
                    let body = actor.body_profile().into_owned();
                    let to = self
                        .resolved
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone();
                    if crate::reception::vision_parameters(&core.state.installed, actor).radius
                        == 0.0
                    {
                        if crate::spatial::distance(from.point(), to.point())
                            > installed.movement.direct_probe_max_distance()
                        {
                            self.refuse(&ordinary.unreachable);
                            continue;
                        }
                        self.question(core, Phase::Probe)?
                            .walking
                            .push(WalkingSegment { from, to, body });
                    } else {
                        self.question(core, Phase::Route)?
                            .routes
                            .push(RouteQuery::Surface { from, to, body });
                    }
                    return Ok(Progress::Geometry);
                }
                Phase::Prepared => {
                    if core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| {
                            a.kind == "status-effect"
                                && !core
                                    .state
                                    .installed
                                    .status_policy
                                    .definitions
                                    .iter()
                                    .any(|d| {
                                        Some(d.id.as_str()) == a.definition_id.as_deref()
                                            && d.interrupt_on.iter().any(|r| r == "new-action")
                                    })
                        })
                    {
                        self.refuse(&ordinary.cannot_interrupt);
                        continue;
                    }
                    if let Some(native) = &self.options.native_movement {
                        let actor = core
                            .state
                            .physical
                            .entities
                            .get(&actor_id)
                            .ok_or(ExecutionError::MissingActor)?;
                        let animal = actor
                            .animal
                            .as_ref()
                            .ok_or(ExecutionError::UnsupportedFamily)?;
                        let episode = animal.episode.as_ref();
                        let (pin, locomotion) = match native.binding.mode {
                            crate::native_response::LocomotionMode::Travel => {
                                (&animal.profile, animal.locomotion.as_str())
                            }
                            crate::native_response::LocomotionMode::Escape => {
                                let e = episode.ok_or(ExecutionError::Invariant)?;
                                (&e.profile_pin, e.locomotion.as_str())
                            }
                        };
                        if !self.options.native_controller
                            || native.binding.profile != *pin
                            || native.binding.locomotion != locomotion
                            || matches!(
                                native.binding.mode,
                                crate::native_response::LocomotionMode::Escape
                            ) && episode.is_none_or(|e| {
                                native.binding.episode_id.as_deref() != Some(e.id.as_str())
                                    || native.binding.generation != Some(e.proposal_generation)
                            })
                        {
                            self.refuse(&ordinary.stale_native_movement);
                            continue;
                        }
                        let extra = native
                            .binding
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?;
                        let storage = self
                            .action_storage
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?;
                        storage.resize(
                            storage
                                .bytes()
                                .checked_add(extra)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.action
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .native_locomotion = Some(native.binding.clone());
                    }
                    self.size_action_storage()?;
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordPrepared;
                }
                Phase::RecordPrepared => {
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    if !self.options.native_controller {
                        let mut view = self.view.take().ok_or(ExecutionError::Invariant)?;
                        let _view_guard = self
                            .view_reservation
                            .take()
                            .ok_or(ExecutionError::Invariant)?;
                        if self
                            .action
                            .as_ref()
                            .is_some_and(|action| action.stage == "approaching")
                        {
                            self.reserve(
                                crate::activity::approach_view_bytes(
                                    &view,
                                    &ordinary.approach_name,
                                    &ordinary.approach_facts,
                                )
                                .ok_or(ExecutionError::Capacity)?,
                            )?;
                            crate::activity::prepare_approach_view(
                                &mut view,
                                &ordinary.approach_name,
                                &ordinary.approach_facts,
                            );
                        }
                        let id = core
                            .journal
                            .activity
                            .begin(
                                &mut core.state.activity,
                                &core.state.physical.entities,
                                &self.command,
                                &self.command.envelope().id,
                                view,
                                core.state.physical.header.sim_time,
                                activity_parent(&core.state.physical.entities, &self.command),
                            )
                            .map_err(ExecutionError::Activity)?;
                        self.activity_id = Some(id);
                    }
                    // Saved IDs are bounded by MAX_SAFE_INTEGER (16 decimal
                    // digits). Admission precedes allocation and the retained copy.
                    self.grow_action_storage("action-".len() + 16)?;
                    let action_id = core.physical().allocate("action")?.id;
                    self.action.as_mut().ok_or(ExecutionError::Invariant)?.id = action_id.clone();
                    self.size_action_storage()?;
                    if let Some(id) = &self.activity_id {
                        core.journal
                            .activity
                            .bind_action(&mut core.state.activity, &actor_id, id, &action_id)
                            .map_err(ExecutionError::Activity)?;
                    }
                    self.phase = Phase::Interrupt;
                }
                Phase::Interrupt => {
                    if !self.materialized {
                        core.physical().settle_entity(&actor_id)?;
                        self.materialized = true;
                    }
                    let reason = if matches!(self.command, NativeCommand::Cancel { .. }) {
                        "voluntary"
                    } else {
                        "new-action"
                    };
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    if let Some(definition) =
                        installed.status_policy.definitions.get(self.interrupt_at)
                    {
                        self.interrupt_at += 1;
                        if definition.interrupt_on.iter().any(|r| r == reason) {
                            let status =
                                core.deactivate_status(&actor_id, &definition.id, reason)?;
                            if let Some(event) = self.complete_status(status, Phase::Interrupt)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        continue;
                    }
                    if core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| a.kind == "status-effect")
                    {
                        self.refuse(if reason == "voluntary" {
                            &ordinary.cannot_cancel
                        } else {
                            &ordinary.cannot_interrupt
                        });
                        continue;
                    }
                    self.phase = if matches!(self.command, NativeCommand::Cancel { .. }) {
                        Phase::CancelEnd
                    } else {
                        Phase::Replace
                    };
                }
                Phase::Replace | Phase::CancelEnd => {
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    let cancelling = matches!(self.phase, Phase::CancelEnd);
                    let old = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .map(|a| a.id.clone());
                    if let Some(old) = old {
                        if !cancelling {
                            core.physical().release_work(&old)?;
                        }
                        let result = if cancelling {
                            &ordinary.cancelled_by_choice
                        } else {
                            &ordinary.cancelled_replaced
                        }
                        .outcome(false);
                        if let Some(pending) = core
                            .journal
                            .activity
                            .prepare_end(
                                &mut core.state.activity,
                                &actor_id,
                                &old,
                                result,
                                core.state.physical.header.sim_time,
                                &ordinary.before_attempt_facts,
                            )
                            .map_err(ExecutionError::Activity)?
                        {
                            self.personal = Some(PersonalTask::Replaced(pending));
                            if cancelling {
                                self.pending_release = Some(old);
                            }
                            continue;
                        }
                        if cancelling {
                            core.physical().release_work(&old)?;
                        }
                    }
                    self.phase = if cancelling {
                        Phase::CancelClear
                    } else {
                        Phase::Install
                    };
                }
                Phase::Install => {
                    let action = self.action.take().ok_or(ExecutionError::Invariant)?;
                    let action_id = action.id.clone();
                    core.physical().replace_action(
                        &actor_id,
                        Some(crate::state::FundedAction::from_storage(
                            action,
                            self.action_storage
                                .take()
                                .ok_or(ExecutionError::Invariant)?,
                        )?),
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: Some(false),
                        },
                    )?;
                    let mut result = ordinary.accepted.outcome(true);
                    result.action_id = Some(action_id);
                    self.outcome = Some(result);
                    if let Some(id) = &self.activity_id {
                        if core
                            .state
                            .physical
                            .entities
                            .get(&actor_id)
                            .and_then(|entity| entity.actor.as_ref())
                            .and_then(|actor| actor.action.as_ref())
                            .is_some_and(|action| action.stage == "approaching")
                        {
                            core.journal
                                .activity
                                .begin_approach(
                                    &mut core.state.activity,
                                    &actor_id,
                                    id,
                                    &ordinary.approach_name,
                                    &ordinary.approach_facts,
                                )
                                .map_err(ExecutionError::Activity)?;
                        }
                    }
                    let native = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| a.native_locomotion.is_some());
                    let routine = if let Some(id) = &self.activity_id {
                        let record = core
                            .state
                            .activity
                            .collections
                            .get(&actor_id)
                            .ok_or(ExecutionError::Invariant)?
                            .get(id)
                            .map_err(ExecutionError::Activity)?
                            .ok_or(ExecutionError::Invariant)?;
                        core.state
                            .installed
                            .account_law()
                            .routine_movement(
                                &core.state.physical,
                                &core.state.experience,
                                &actor_id,
                                crate::attention::ActivityRecordingContext::from_occurrence(
                                    &record.occurrence,
                                ),
                                crate::worlds::MovementRecordingPhase::Departure,
                                None,
                            )
                            .map_err(ExecutionError::Received)?
                    } else {
                        false
                    };
                    if !native && !routine {
                        let NativeCommand::Move { destination, .. } = &self.command else {
                            return Err(ExecutionError::Invariant);
                        };
                        let point = destination.point();
                        let bytes = ordinary
                            .departure_heap_bound(point)
                            .ok_or(ExecutionError::Capacity)?;
                        self._reservation.resize(
                            self._reservation
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let text = Narration {
                            parts: vec![
                                NarrationPart::Participant {
                                    entity_id: actor_id.clone(),
                                    role: PersonRole::Subject,
                                    article: None,
                                },
                                NarrationPart::Literal(" ".into()),
                                NarrationPart::Literal(
                                    ordinary
                                        .departure(point)
                                        .map_err(|_| ExecutionError::Invariant)?
                                        .into(),
                                ),
                            ],
                        };
                        let mut data = IndexMap::new();
                        data.insert(
                            "actionType".to_owned(),
                            crate::reception::EventScalar::Text(("move".to_owned()).into()),
                        );
                        let event = core.stage_event(EventEmissionIntent {
                            event_type: ordinary.action_started_event.clone(),
                            text: EmissionText::Narration(text),
                            audience: AudienceSelection::Physical,
                            source_id: Some(actor_id),
                            target_id: None,
                            data: Some(data),
                            scope: EventScope::External,
                            origin: None,
                            exposure: None,
                        })?;
                        self.event = Some(event.id.clone());
                        self.after_event = Phase::AfterDeparture;
                        return Ok(Progress::Occurrence(event));
                    }
                    self.phase = Phase::AfterDeparture;
                }
                Phase::AfterDeparture => {
                    if !self.options.native_controller {
                        let id = self
                            .outcome
                            .as_ref()
                            .and_then(|o| o.action_id.as_deref())
                            .ok_or(ExecutionError::Invariant)?;
                        core.physical().begin_semantic_work(&actor_id, id)?;
                    }
                    self.phase = Phase::Tail;
                }
                Phase::CancelClear => {
                    core.physical().replace_action(
                        &actor_id,
                        None,
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: Some(false),
                        },
                    )?;
                    self.outcome = Some(ordinary.stopped.outcome(true));
                    self.phase = Phase::Tail;
                }
                Phase::Deactivate => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        facing_heading,
                        resting_place_id,
                        resting_bay,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    let Some(definition) = installed
                        .status_policy
                        .definitions
                        .iter()
                        .find(|d| &d.id == definition_id)
                    else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    let Some(target) = core.state.physical.entities.get(target_id) else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    let Some(actions) = &definition.actions else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    if facing_heading.is_some_and(|heading| {
                        !heading.is_finite()
                            || *operation != StatusOperation::Activate
                            || definition
                                .presentation
                                .as_ref()
                                .and_then(|presentation| presentation.pose.as_deref())
                                != Some("horizontal")
                    }) {
                        self.refuse(&ordinary.invalid_facing);
                        continue;
                    }
                    if resting_place_id.is_some() || resting_bay.is_some() {
                        self.refuse(&ordinary.invalid_resting_place);
                        continue;
                    }
                    if &actor_id != target_id {
                        if !actions.allow_other
                            || *operation == StatusOperation::Activate && !actions.activate_other
                        {
                            self.refuse(&ordinary.out_of_reach);
                            continue;
                        }
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let sight = crate::reception::SightBatch::prepare(
                            &core.state.physical,
                            &installed,
                            &actor_id,
                            &[target_id.as_str()],
                            self.binding,
                            &self.budget,
                        )
                        .map_err(|_| ExecutionError::Invariant)?;
                        self.sight = Some(sight);
                        self.phase = Phase::StatusSight;
                        return Ok(Progress::Geometry);
                    }
                    let _ = target;
                    self.phase = Phase::StatusApply;
                }
                Phase::StatusReach => {
                    let NativeCommand::StatusEffect { target_id, .. } = &self.command else {
                        return Err(ExecutionError::Invariant);
                    };
                    let observer = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let target = core
                        .state
                        .physical
                        .entities
                        .get(target_id)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let mut from = observer
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    from.y += observer.body_profile().interaction_height;
                    let mut to = target
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    to.y += target.body_profile().interaction_height;
                    if crate::spatial::distance(from, to)
                        > core.state.installed.movement.interaction_radius()
                    {
                        self.refuse(&ordinary.out_of_reach);
                        continue;
                    }
                    self.question(core, Phase::StatusReach)?
                        .sight
                        .push(crate::geometry::SightRay { from, to });
                    return Ok(Progress::Geometry);
                }
                Phase::StatusApply => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    let active = core
                        .state
                        .physical
                        .entities
                        .get(target_id)
                        .and_then(|e| e.status_effects.as_ref())
                        .and_then(|states| states.get(definition_id))
                        .is_some_and(|state| state.active);
                    if *operation == StatusOperation::Deactivate && !active {
                        self.refuse(&ordinary.not_active);
                        continue;
                    }
                    if *operation == StatusOperation::Activate {
                        let definition = installed
                            .status_policy
                            .definitions
                            .iter()
                            .find(|definition| &definition.id == definition_id)
                            .ok_or(ExecutionError::Invariant)?;
                        let bindings = crate::status::EffectBindings {
                            subject: target_id,
                            source: &actor_id,
                            action_target: target_id,
                        };
                        let scratch = crate::status::status_condition_scratch(
                            &core.state.physical.entities,
                            bindings,
                            &definition.requires,
                        )
                        .max(
                            definition
                                .activation_condition
                                .as_ref()
                                .map_or(0, |condition| {
                                    crate::status::status_condition_scratch(
                                        &core.state.physical.entities,
                                        bindings,
                                        condition,
                                    )
                                }),
                        );
                        core.physical().reserve_status_growth(scratch)?;
                        if !installed
                            .status_read(&core.state.physical)
                            .can_activate_metered(bindings, definition, &mut core.journal.meters)?
                        {
                            self.refuse(&ordinary.not_applicable);
                            continue;
                        }
                    }
                    self.status_was_active = active;
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordStatus;
                }
                Phase::RecordStatus => {
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
                        let _view_guard = self
                            .view_reservation
                            .take()
                            .ok_or(ExecutionError::Invariant)?;
                        self.activity_id = Some(
                            core.journal
                                .activity
                                .begin(
                                    &mut core.state.activity,
                                    &core.state.physical.entities,
                                    &self.command,
                                    &self.command.envelope().id,
                                    view,
                                    core.state.physical.header.sim_time,
                                    activity_parent(&core.state.physical.entities, &self.command),
                                )
                                .map_err(ExecutionError::Activity)?,
                        );
                    }
                    let activate = *operation == StatusOperation::Activate;
                    let target_id = target_id.clone();
                    let definition_id = definition_id.clone();
                    if activate {
                        self.activation = Some(StatusActivationCursor::new(
                            &target_id,
                            &definition_id,
                            &actor_id,
                            &target_id,
                            "voluntary",
                            &self.budget,
                        )?);
                        continue;
                    }
                    let status = core.deactivate_status(&target_id, &definition_id, "voluntary")?;
                    if let Some(event) = self.complete_status(status, Phase::StatusFacts)? {
                        return Ok(Progress::Occurrence(event));
                    }
                }
                Phase::StatusFacts => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        facing_heading,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    if let Some(heading) = facing_heading {
                        core.physical().set_heading(target_id, *heading)?;
                    }
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    let definition = installed
                        .status_policy
                        .definitions
                        .iter()
                        .find(|d| &d.id == definition_id)
                        .ok_or(ExecutionError::Invariant)?;
                    if self.activity_id.is_some() {
                        let reader = crate::worlds::InstalledPersonalNameReader::prepare(
                            &core.state.physical,
                            &core.state.reception,
                            &installed,
                            &core.state.experience,
                            &actor_id,
                        )
                        .map_err(ExecutionError::Received)?;
                        let name = reader
                            .observer_name(target_id)
                            .map_err(ExecutionError::Received)?;
                        let bytes = name.name.storage_bytes() * 3
                            + target_id.len()
                            + 2 * std::mem::size_of::<NarrationPart>()
                            + 32;
                        self._reservation.resize(
                            self._reservation
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let names = reader
                            .capture_names(&[target_id], &self.budget)
                            .map_err(ExecutionError::Received)?;
                        let label = names
                            .render_narration(
                                &Narration {
                                    parts: vec![NarrationPart::Participant {
                                        entity_id: target_id.clone(),
                                        role: PersonRole::Object,
                                        article: None,
                                    }],
                                },
                                crate::narration::GrammaticalPerson::First,
                            )
                            .map_err(ExecutionError::Received)?;
                        let after = core
                            .state
                            .physical
                            .entities
                            .get(target_id)
                            .and_then(|e| e.status_effects.as_ref())
                            .and_then(|states| states.get(definition_id))
                            .is_some_and(|state| state.active);
                        core.journal
                            .activity
                            .record_effect(
                                &mut core.state.activity,
                                &self.command.envelope().id,
                                target_id,
                                &definition.label,
                                None,
                                crate::activity::ActivityScalar::Boolean(self.status_was_active),
                                crate::activity::ActivityScalar::Boolean(after),
                                &label,
                            )
                            .map_err(ExecutionError::Activity)?;
                    }
                    let bytes = definition
                        .label
                        .len()
                        .checked_add(ordinary.deactivated.len().max(ordinary.activated.len()))
                        .and_then(|n| n.checked_add(ordinary.status_outcome_code.len()))
                        .and_then(|n| n.checked_add(4))
                        .ok_or(ExecutionError::Capacity)?;
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.outcome = Some(outcome(
                        true,
                        &ordinary.status_outcome_code,
                        &ordinary.status_message(
                            &definition.label,
                            *operation == StatusOperation::Activate,
                        ),
                    ));
                    self.phase = Phase::ImmediateResult;
                }
                Phase::Speech => {
                    // The selected family borrows only immutable law/command
                    // data. Its complete allocation is admitted before making
                    // the actual activity and original event in source order.
                    let installed = core.state.installed.clone();
                    let speech = installed.speech_action.value();
                    let plan = match speech.prepare(
                        &self.command,
                        &core.state.physical.entities,
                        installed.acoustics.value(),
                    ) {
                        Ok(plan) => plan,
                        Err(problem) => {
                            let bytes = problem
                                .code
                                .len()
                                .checked_add(problem.message.len())
                                .ok_or(ExecutionError::Capacity)?;
                            self._reservation.resize(
                                self._reservation
                                    .bytes()
                                    .checked_add(bytes)
                                    .ok_or(ExecutionError::Capacity)?,
                            )?;
                            self.outcome = Some(outcome(false, &problem.code, &problem.message));
                            self.phase = Phase::Done;
                            continue;
                        }
                    };
                    let bytes = plan
                        .heap_bound()
                        .and_then(|n| n.checked_add(speech.success.code.len()))
                        .and_then(|n| n.checked_add(speech.success.message.len()))
                        .and_then(|n| n.checked_add(128))
                        .ok_or(ExecutionError::Capacity)?;
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(bytes)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.prepared_speech = Some(plan.emission());
                    self.outcome =
                        Some(outcome(true, &speech.success.code, &speech.success.message));
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordSpeech;
                }
                Phase::RecordSpeech => {
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
                        let _view_guard = self
                            .view_reservation
                            .take()
                            .ok_or(ExecutionError::Invariant)?;
                        let id = core
                            .journal
                            .activity
                            .begin(
                                &mut core.state.activity,
                                &core.state.physical.entities,
                                &self.command,
                                &self.command.envelope().id,
                                view,
                                core.state.physical.header.sim_time,
                                activity_parent(&core.state.physical.entities, &self.command),
                            )
                            .map_err(ExecutionError::Activity)?;
                        self.activity_id = Some(id);
                    }
                    let event = core.stage_event(
                        self.prepared_speech
                            .take()
                            .ok_or(ExecutionError::Invariant)?,
                    )?;
                    self.event = Some(event.id.clone());
                    self.after_event = Phase::ImmediateResult;
                    return Ok(Progress::Occurrence(event));
                }
                Phase::ImmediateResult => {
                    self.begin_chosen_work(core)?;
                    if self.activity_id.is_some() {
                        let result = self
                            .outcome
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .clone();
                        if let Some(pending) = core
                            .journal
                            .activity
                            .prepare_end(
                                &mut core.state.activity,
                                &actor_id,
                                &self.command.envelope().id,
                                result,
                                core.state.physical.header.sim_time,
                                &ordinary.before_attempt_facts,
                            )
                            .map_err(ExecutionError::Activity)?
                        {
                            self.personal = Some(PersonalTask::Immediate(pending));
                            continue;
                        }
                    }
                    self.phase = Phase::Tail;
                }
                Phase::Tail => {
                    self.begin_chosen_work(core)?;
                    let result = self.outcome.as_ref().ok_or(ExecutionError::Invariant)?;
                    if result.ok && !self.duplicate && !self.options.native_controller {
                        core.journal.commands.append(
                            &mut core.state.commands,
                            &self.command.envelope().id,
                            &self.canonical,
                            result,
                        )?;
                    }
                    // Source records the command receipt before reconciling its
                    // actor's real condition episodes and private notices.
                    self.conditions = Some(crate::conditions::ConditionReconcileCursor::new(
                        &actor_id,
                        &self.budget,
                    )?);
                    self.phase = Phase::Conditions;
                }
                Phase::Conditions => return Err(ExecutionError::UnfinishedOccurrence),
                Phase::Done => {
                    let result = self.outcome.take().ok_or(ExecutionError::Invariant)?;
                    let exposure = self.exposure.take();
                    self.finalize = result.ok && !self.duplicate;
                    self.abort(core)?;
                    return Ok(Progress::Complete(super::PendingCommandCompletion::new(
                        core,
                        &self.command.envelope().actor_id,
                        &self.command.envelope().id,
                        result,
                        self.finalize,
                        exposure,
                        self.options.native_movement.take(),
                        &self.budget,
                    )?));
                }
                Phase::Support | Phase::Probe | Phase::StatusSight => {
                    return Ok(Progress::Geometry);
                }
            }
        }
    }
}

fn actor_problem(
    core: &CoreMutation<'_>,
    command: &NativeCommand,
    native: bool,
) -> Result<Option<Outcome>, ExecutionError> {
    let ordinary = core.state.installed.ordinary_actions.value();
    let Some(entity) = core
        .state
        .physical
        .entities
        .get(&command.envelope().actor_id)
    else {
        return Ok(Some(ordinary.unknown_actor.outcome(false)));
    };
    let Some(actor) = &entity.actor else {
        return Ok(Some(ordinary.unknown_actor.outcome(false)));
    };
    if entity.spatial.local_pose.is_some()
        || actor
            .action
            .as_ref()
            .is_some_and(|action| action.kind == "strike" && action.stage == "working")
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if command.envelope().cooperation.is_some()
        || command.envelope().combat_help_id.is_some()
        || [actor.agency.plan.as_ref(), actor.agency.suspended_plan()]
            .into_iter()
            .flatten()
            .any(|plan| {
                plan.activity.is_some() || plan.steps.iter().any(|step| step.activity_key.is_some())
            })
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if !entity.actively_participates() {
        return Ok(Some(ordinary.inactive.outcome(false)));
    }
    let release_self = matches!(command,NativeCommand::StatusEffect{target_id,operation:StatusOperation::Deactivate,..}if target_id==&entity.id);
    if core
        .state
        .installed
        .capabilities
        .capability_blocked(Some(entity), "actions")?
        && !release_self
        && !matches!(command, NativeCommand::Cancel { .. })
    {
        return Ok(Some(ordinary.actions_restricted.outcome(false)));
    }
    if matches!(command, NativeCommand::Say { .. })
        && core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "speech")?
    {
        return Ok(Some(ordinary.speech_restricted.outcome(false)));
    }
    if matches!(command, NativeCommand::Move { .. })
        && core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
    {
        return Ok(Some(ordinary.movement_restricted.outcome(false)));
    }
    if core.state.physical.header.paused && !matches!(command, NativeCommand::Cancel { .. }) {
        return Ok(Some(ordinary.paused.outcome(false)));
    }
    if !actor.alive || actor.incapacitated {
        return Ok(Some(ordinary.not_alive.outcome(false)));
    }
    if entity.supported_position().is_none()
        && !matches!(
            command,
            NativeCommand::Say { .. } | NativeCommand::Cancel { .. }
        )
    {
        return Ok(Some(ordinary.unsupported_airborne.outcome(false)));
    }
    if native && (actor.controller != "native" || entity.animal.is_none()) {
        return Ok(Some(ordinary.unsupported_controller.outcome(false)));
    }
    if !matches!(command, NativeCommand::Cancel { .. })
        && entity.has_memory()
        && core.state.activity.header.admitted >= core.state.activity.limits.retained_records
    {
        return Ok(Some(ordinary.experience_capacity.outcome(false)));
    }
    Ok(None)
}

fn activity_parent<'a>(
    entities: &'a crate::state::EntityStore,
    command: &NativeCommand,
) -> Option<&'a str> {
    entities
        .get(&command.envelope().actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.agency.plan.as_ref())
        .filter(|plan| {
            plan.steps
                .iter()
                .any(|step| step.id == command.envelope().id)
        })
        .map(|plan| plan.id.as_str())
}
