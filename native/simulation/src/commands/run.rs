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
    StagedOccurrence, StatusEnd,
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
}
pub(crate) enum CommandStep<'a> {
    Geometry(&'a GeometryQueries),
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    Complete(Outcome),
}
enum Progress {
    Geometry,
    Occurrence(StagedOccurrence),
    Personal,
    Complete(Outcome),
}
#[derive(Clone, Copy)]
enum Phase {
    Start,
    Support,
    Standing,
    Route,
    Probe,
    Prepared,
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
    ImmediateResult,
    Tail,
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
    options: CommandOptions,
    phase: Phase,
    queries: Option<GeometryQueries>,
    binding: GeometryBinding,
    resolved: Option<SurfacePoint>,
    action: Option<Action>,
    activity_id: Option<String>,
    interrupt_at: usize,
    personal: Option<PersonalTask>,
    event: Option<String>,
    after_event: Phase,
    pending_release: Option<String>,
    sight: Option<crate::reception::SightBatch>,
    status_was_active: bool,
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
        message: message.to_owned(),
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
        view: Option<ActivityView>,
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
            + view
                .as_ref()
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            command,
            canonical,
            view,
            options,
            phase: Phase::Start,
            queries: None,
            binding,
            resolved: None,
            action: None,
            activity_id: None,
            interrupt_at: 0,
            personal: None,
            event: None,
            after_event: Phase::Tail,
            pending_release: None,
            sight: None,
            status_was_active: false,
            budget: budget.clone(),
            outcome: None,
            meter: None,
            duplicate: false,
            finalize: false,
            materialized: false,
            _reservation: reservation,
        })
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.command.envelope().actor_id
    }
    pub(crate) fn requires_finalization(&self) -> bool {
        self.finalize
    }
    /// The coordinator calls this on an operational error before rolling back
    /// its command checkpoint. Operational work already spent is never refunded.
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(meter) = self.meter.take() {
            core.journal.meters.finish(meter)?;
        }
        Ok(())
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
    fn refuse(&mut self, code: &str, message: &str) {
        self.outcome = Some(outcome(false, code, message));
        self.phase = Phase::Done;
    }
    fn question(&mut self, phase: Phase) -> Result<&mut GeometryQueries, ExecutionError> {
        self.binding.serial = self
            .binding
            .serial
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
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
            Progress::Personal => CommandStep::Personal(
                self.personal
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .result(),
            ),
            Progress::Occurrence(event) => CommandStep::Occurrence(event),
            Progress::Complete(result) => CommandStep::Complete(result),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        if let Some(answer) = answer {
            match answer {
                CommandAnswer::Occurrence(completed) => {
                    if self.event.as_deref() != Some(completed.event_id()) {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.event = None;
                    self.phase = self.after_event;
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
                            self.phase = if matches!(self.command, NativeCommand::Cancel { .. }) {
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
                            if let Some(event) = self.complete_status(status, self.after_event)? {
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
                        let NativeCommand::StatusEffect { target_id, .. } = &self.command else {
                            return Err(ExecutionError::Invariant);
                        };
                        if sight.seen(target_id) != Some(true) {
                            self.refuse(
                                "out-of-reach",
                                "The target must be permitted, visible and within reach.",
                            );
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
                                self.refuse("blocked", "Choose walkable ground.");
                                return self.drive(core, None);
                            };
                            self.resolved = Some(point);
                            self.phase = Phase::Standing;
                            self.queries = None;
                        }
                        Phase::Standing => {
                            if !answer.standing.pop().ok_or(ExecutionError::Invariant)? {
                                self.refuse("blocked", "Choose walkable ground.");
                            } else {
                                self.phase = Phase::Route;
                            }
                            self.queries = None;
                        }
                        Phase::Route => {
                            let route = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
                            let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
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
                                RoutePlan::InvalidEndpoint { .. } => self.refuse(
                                    "unreachable",
                                    "No supported route to a reachable stance was found.",
                                ),
                                RoutePlan::NoRoute { .. } => {
                                    self.refuse("no-route", "No supported route was found.")
                                }
                                RoutePlan::BudgetExceeded { .. } => {
                                    self.refuse("budget-exceeded", "No supported route was found.")
                                }
                            }
                            if !matches!(self.phase, Phase::Done) {
                                self.phase = Phase::Prepared;
                            }
                            self.queries = None;
                        }
                        Phase::StatusReach => {
                            if !answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                self.refuse(
                                    "out-of-reach",
                                    "The target must be permitted, visible and within reach.",
                                );
                            } else {
                                self.phase = Phase::StatusApply;
                            }
                            self.queries = None;
                        }
                        Phase::Probe => {
                            if !answer.walking.pop().ok_or(ExecutionError::Invariant)? {
                                self.refuse(
                                    "unreachable",
                                    "No supported route to a reachable stance was found.",
                                );
                            } else {
                                let action =
                                    self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                                action.stage = "approaching".to_owned();
                                action.path = vec![
                                    self.resolved
                                        .as_ref()
                                        .ok_or(ExecutionError::Invariant)?
                                        .clone(),
                                ];
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
        loop {
            if self.personal.is_some() {
                return Ok(Progress::Personal);
            }
            let actor_id = self.command.envelope().actor_id.clone();
            match self.phase {
                Phase::Start => {
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
                            self.refuse(
                                "idempotency-conflict",
                                "This command ID was already used with another body.",
                            );
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
                                self.refuse("blocked", "Choose walkable ground.");
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
                                self.refuse(
                                    "unsupported-navigation",
                                    "Only a short direct probe is supported without vision.",
                                );
                                continue;
                            }
                            let point = destination.point();
                            let surface_id = destination.surface_id.clone();
                            self.question(Phase::Support)?.support.push(SupportQuery {
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
                                self.refuse(
                                    "stale-action",
                                    "That action has ended or been replaced.",
                                );
                                continue;
                            }
                            self.phase = Phase::Interrupt;
                        }
                        NativeCommand::StatusEffect {
                            operation: StatusOperation::Deactivate,
                            ..
                        } => self.phase = Phase::Deactivate,
                        NativeCommand::StatusEffect {
                            operation: StatusOperation::Activate,
                            ..
                        }
                        | NativeCommand::Say { .. } => {
                            return Err(ExecutionError::UnsupportedFamily);
                        }
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
                    self.question(Phase::Standing)?
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
                    if let Some(native) = &self.options.native_movement {
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
                        self.question(Phase::Probe)?.walking.push(WalkingSegment {
                            from,
                            to,
                            body,
                        });
                    } else {
                        self.question(Phase::Route)?
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
                        self.refuse(
                            "cannot-interrupt",
                            "The current state must end before starting another activity.",
                        );
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
                            self.refuse(
                                "stale-native-movement",
                                "The selected native movement is no longer current.",
                            );
                            continue;
                        }
                        self.action
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .native_locomotion = Some(native.binding.clone());
                    }
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
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
                                None,
                            )
                            .map_err(ExecutionError::Activity)?;
                        self.activity_id = Some(id);
                    }
                    let action_id = core.physical().allocate("action")?.id;
                    self.action.as_mut().ok_or(ExecutionError::Invariant)?.id = action_id.clone();
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
                        self.refuse(
                            "cannot-interrupt",
                            if reason == "voluntary" {
                                "This state does not allow voluntary interruption."
                            } else {
                                "The current state must end before starting another activity."
                            },
                        );
                        continue;
                    }
                    self.phase = if matches!(self.command, NativeCommand::Cancel { .. }) {
                        Phase::CancelEnd
                    } else {
                        Phase::Replace
                    };
                }
                Phase::Replace | Phase::CancelEnd => {
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
                        let result = outcome(
                            false,
                            "cancelled",
                            if cancelling {
                                "Stopped by choice; already committed effects remain."
                            } else {
                                "Replaced by newly chosen work; committed effects remain."
                            },
                        );
                        if let Some(pending) = core
                            .journal
                            .activity
                            .prepare_end(
                                &mut core.state.activity,
                                &actor_id,
                                &old,
                                result,
                                core.state.physical.header.sim_time,
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
                        Some(action),
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: Some(false),
                        },
                    )?;
                    let mut result = outcome(true, "accepted", "Action started.");
                    result.action_id = Some(action_id);
                    self.outcome = Some(result);
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
                        let x = crate::encoding::json_record(&destination.x)
                            .map_err(|_| ExecutionError::Invariant)?;
                        let z = crate::encoding::json_record(&destination.z)
                            .map_err(|_| ExecutionError::Invariant)?;
                        let text = Narration {
                            parts: vec![
                                NarrationPart::Participant {
                                    entity_id: actor_id.clone(),
                                    role: PersonRole::Subject,
                                    article: None,
                                },
                                NarrationPart::Literal(" ".to_owned()),
                                NarrationPart::Literal(format!("started moving to {x}, {z}.")),
                            ],
                        };
                        let mut data = IndexMap::new();
                        data.insert(
                            "actionType".to_owned(),
                            crate::reception::EventScalar::Text("move".to_owned()),
                        );
                        let event = core.stage_event(EventEmissionIntent {
                            event_type: "action-started".to_owned(),
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
                    self.outcome = Some(outcome(
                        true,
                        "cancelled",
                        "Stopped. Materials already used in work remain consumed.",
                    ));
                    self.phase = Phase::Tail;
                }
                Phase::Deactivate => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        facing_heading,
                        resting_place_id,
                        resting_bay,
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
                        self.refuse(
                            "invalid-effect",
                            "Choose an available status effect and target.",
                        );
                        continue;
                    };
                    let Some(target) = core.state.physical.entities.get(target_id) else {
                        self.refuse(
                            "invalid-effect",
                            "Choose an available status effect and target.",
                        );
                        continue;
                    };
                    let Some(actions) = &definition.actions else {
                        self.refuse(
                            "invalid-effect",
                            "Choose an available status effect and target.",
                        );
                        continue;
                    };
                    if facing_heading.is_some() {
                        self.refuse(
                            "invalid-pose",
                            "Choose a valid facing for an ordinary resting posture.",
                        );
                        continue;
                    }
                    if resting_place_id.is_some() || resting_bay.is_some() {
                        self.refuse(
                            "invalid-pose",
                            "Choose an available resting place for this person.",
                        );
                        continue;
                    }
                    if &actor_id != target_id {
                        if !actions.allow_other {
                            self.refuse(
                                "out-of-reach",
                                "The target must be permitted, visible and within reach.",
                            );
                            continue;
                        }
                        self.binding.serial = self
                            .binding
                            .serial
                            .checked_add(1)
                            .ok_or(ExecutionError::Invariant)?;
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
                        self.refuse(
                            "out-of-reach",
                            "The target must be permitted, visible and within reach.",
                        );
                        continue;
                    }
                    self.question(Phase::StatusReach)?
                        .sight
                        .push(crate::geometry::SightRay { from, to });
                    return Ok(Progress::Geometry);
                }
                Phase::StatusApply => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
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
                    if !active {
                        self.refuse("not-active", "That status effect is not active.");
                        continue;
                    }
                    self.status_was_active = active;
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
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
                                    None,
                                )
                                .map_err(ExecutionError::Activity)?,
                        );
                    }
                    let target_id = target_id.clone();
                    let definition_id = definition_id.clone();
                    let status = core.deactivate_status(&target_id, &definition_id, "voluntary")?;
                    if let Some(event) = self.complete_status(status, Phase::StatusFacts)? {
                        return Ok(Progress::Occurrence(event));
                    }
                }
                Phase::StatusFacts => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
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
                        let bytes = name.name.len() * 3
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
                    self.outcome = Some(outcome(
                        true,
                        "status-effect",
                        &format!("{}: deactivated.", definition.label),
                    ));
                    self.phase = Phase::ImmediateResult;
                }
                Phase::ImmediateResult => {
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
                    self.phase = Phase::Done;
                }
                Phase::Done => {
                    let result = self.outcome.take().ok_or(ExecutionError::Invariant)?;
                    self.finalize = result.ok && !self.duplicate;
                    if result.ok && !self.duplicate && !self.options.native_controller {
                        core.journal.commands.append(
                            &mut core.state.commands,
                            &self.command.envelope().id,
                            &self.canonical,
                            &result,
                        )?;
                    }
                    self.abort(core)?;
                    return Ok(Progress::Complete(result));
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
    let Some(entity) = core
        .state
        .physical
        .entities
        .get(&command.envelope().actor_id)
    else {
        return Ok(Some(outcome(
            false,
            "unknown-actor",
            "That actor does not exist.",
        )));
    };
    let Some(actor) = &entity.actor else {
        return Ok(Some(outcome(
            false,
            "unknown-actor",
            "That actor does not exist.",
        )));
    };
    if command.envelope().cooperation.is_some()
        || command.envelope().combat_help_id.is_some()
        || actor.agency.plan.is_some()
        || actor.agency.suspended.is_some()
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if !entity.actively_participates() {
        return Ok(Some(outcome(
            false,
            "inactive",
            "Return to the world before acting.",
        )));
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
        return Ok(Some(outcome(
            false,
            "capability-restricted",
            "This actor cannot act in its current state.",
        )));
    }
    if matches!(command, NativeCommand::Move { .. })
        && core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
    {
        return Ok(Some(outcome(
            false,
            "capability-restricted",
            "Movement is unavailable.",
        )));
    }
    if core.state.physical.header.paused && !matches!(command, NativeCommand::Cancel { .. }) {
        return Ok(Some(outcome(false, "paused", "The world is paused.")));
    }
    if !actor.alive || actor.incapacitated {
        return Ok(Some(outcome(false, "not-alive", "This actor cannot act.")));
    }
    if entity.supported_position().is_none()
        && !matches!(
            command,
            NativeCommand::Say { .. } | NativeCommand::Cancel { .. }
        )
    {
        return Ok(Some(outcome(
            false,
            "unsupported-airborne-action",
            "This native action requires a supported ground stance.",
        )));
    }
    if native && (actor.controller != "native" || entity.animal.is_none()) {
        return Ok(Some(outcome(
            false,
            "unsupported-controller",
            "This entity has no installed native controller.",
        )));
    }
    if !matches!(command, NativeCommand::Cancel { .. })
        && entity.has_memory()
        && core.state.activity.header.admitted >= core.state.activity.limits.retained_records
    {
        return Ok(Some(outcome(
            false,
            "experience-capacity",
            "The action-record allowance is full. Existing work and history are preserved; new recorded actions need more storage allowance.",
        )));
    }
    Ok(None)
}
