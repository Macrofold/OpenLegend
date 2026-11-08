//! Arrange only the chosen frontier. Dispatch remains the ordinary command
//! cursor in the outer advance; queuing never reports work as performed.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::AcquiredActivityResult;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::values::is_safe_record_id;
use std::mem::size_of;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PlanEditInput {
    pub id: String,
    pub actor_id: String,
    pub commands: Vec<NativeCommand>,
    pub mode: PlanMode,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub expected_revision: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub goal_id: Option<String>,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Preflight,
    Control,
    Retire,
    Install,
    Done,
}
pub(crate) enum PlanEditStep<'a> {
    Personal(&'a crate::activity::PendingActivityResult),
    Complete(&'a Outcome),
}
pub(crate) struct PlanEditCursor {
    input: PlanEditInput,
    phase: Phase,
    control: Option<PlanControlCursor>,
    basis_revision: Option<u64>,
    outcome: Option<Outcome>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl PlanEditCursor {
    pub(crate) fn new(input: PlanEditInput, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let bytes = heap_sum([
            size_of::<Self>(),
            input.id.capacity(),
            input.actor_id.capacity(),
            input.goal_id.heap_bytes().ok_or(ExecutionError::Capacity)?,
            input
                .commands
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            input,
            phase: Phase::Preflight,
            control: None,
            basis_revision: None,
            outcome: None,
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
    fn refuse(
        &mut self,
        rule: &crate::worlds::InstalledActionMessage,
    ) -> Result<(), ExecutionError> {
        self.reserve(
            rule.code
                .len()
                .checked_add(
                    rule.message
                        .len()
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.outcome = Some(rule.outcome(false));
        self.phase = Phase::Done;
        Ok(())
    }
    fn valid_command(core: &CoreMutation<'_>, command: &NativeCommand) -> bool {
        super::validation::valid_command(
            command,
            core.state.installed.speech_action.value(),
            core.state.installed.acoustics.value(),
        )
    }
    fn captured_step(core: &CoreMutation<'_>, command: NativeCommand) -> PlanStep {
        let mut target_episodes = IndexMap::new();
        let target = match &command {
            NativeCommand::Say { target_id, .. } => target_id.as_deref(),
            NativeCommand::StatusEffect { target_id, .. } => Some(target_id.as_str()),
            _ => None,
        };
        if let Some(target) = target.filter(|target| {
            *target != command.envelope().actor_id
                && core
                    .state
                    .physical
                    .entities
                    .get(target)
                    .is_some_and(|entity| entity.actor.is_some())
        }) {
            let episode = core
                .state
                .reception
                .perception_episodes
                .as_ref()
                .and_then(|owners| owners.get(&command.envelope().actor_id))
                .and_then(|episodes| episodes.get(target))
                .cloned();
            target_episodes.insert(target.to_owned(), episode);
        }
        PlanStep {
            target_episodes: Some(target_episodes),
            activity_key: None,
            id: command.envelope().id.clone(),
            command,
            status: StepStatus::Queued,
            action_id: None,
            outcome: None,
            result_evidence: None,
        }
    }
    fn install(&mut self, core: &mut CoreMutation<'_>, append: bool) -> Result<(), ExecutionError> {
        let bound = self
            .input
            .commands
            .iter()
            .try_fold(
                self.input
                    .commands
                    .len()
                    .checked_mul(size_of::<PlanStep>())
                    .ok_or(ExecutionError::Capacity)?,
                |bytes, command| {
                    let target = match command {
                        NativeCommand::Say { target_id, .. } => target_id.as_ref(),
                        NativeCommand::StatusEffect { target_id, .. } => Some(target_id),
                        _ => None,
                    };
                    let episode = target.and_then(|id| {
                        core.state
                            .reception
                            .perception_episodes
                            .as_ref()
                            .and_then(|owners| owners.get(&self.input.actor_id))
                            .and_then(|episodes| episodes.get(id))
                    });
                    heap_sum([
                        bytes,
                        command.heap_bytes().ok_or(ExecutionError::Capacity)?,
                        command.envelope().id.len(),
                        map_storage::<String, Option<String>>(usize::from(target.is_some()))
                            .ok_or(ExecutionError::Capacity)?,
                        target.map_or(0, String::len),
                        episode.map_or(0, String::len),
                    ])
                    .ok_or(ExecutionError::Capacity)
                },
            )?
            .checked_add(
                self.input.id.len()
                    + self.input.goal_id.as_ref().map_or(0, String::len)
                    + size_of::<ActorPlan>(),
            )
            .ok_or(ExecutionError::Capacity)?;
        let old_len = if append {
            core.state
                .physical
                .entities
                .get(&self.input.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.agency.plan.as_ref())
                .ok_or(ExecutionError::Invariant)?
                .steps
                .len()
        } else {
            0
        };
        let total = old_len
            .checked_add(self.input.commands.len())
            .ok_or(ExecutionError::Capacity)?;
        core.physical().reserve_plan_growth(
            bound
                .checked_add(
                    total
                        .checked_mul(2 * size_of::<PlanStep>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let commands = std::mem::take(&mut self.input.commands);
        let mut steps = Vec::with_capacity(commands.len());
        steps.extend(
            commands
                .into_iter()
                .map(|command| Self::captured_step(core, command)),
        );
        let installed = core.state.installed.clone();
        let rules = &installed.ordinary_actions.value().plan;
        let plan_id_len = if append {
            core.state
                .physical
                .entities
                .get(&self.input.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.agency.plan.as_ref())
                .ok_or(ExecutionError::Invariant)?
                .id
                .len()
        } else {
            self.input.id.len()
        };
        self.reserve(rules.queued.code.len() + rules.queued.message.len() * 8 + plan_id_len)?;
        let actor = &self.input.actor_id;
        if append {
            let mut physical = core.physical();
            let plan = physical
                .plan_mut(actor)?
                .as_mut()
                .ok_or(ExecutionError::Invariant)?;
            plan.steps
                .try_reserve_exact(steps.len())
                .map_err(|_| ExecutionError::Capacity)?;
            plan.steps.extend(steps);
            plan.revision = plan
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?;
        } else {
            let revision = self
                .basis_revision
                .unwrap_or(0)
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?;
            *core.physical().plan_mut(actor)? = Some(ActorPlan {
                result_evidence: None,
                activity: None,
                id: self.input.id.clone(),
                revision,
                goal_id: self.input.goal_id.clone(),
                status: PlanStatus::Active,
                steps,
            });
        }
        core.physical().advance_agency_revision(actor)?;
        core.physical().advance_plan_generation(actor)?;
        let mut result = rules.queued.outcome(true);
        result.plan_id = Some(
            core.state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.agency.plan.as_ref())
                .ok_or(ExecutionError::Invariant)?
                .id
                .clone(),
        );
        self.outcome = Some(result);
        self.phase = Phase::Done;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<AcquiredActivityResult>,
    ) -> Result<PlanEditStep<'a>, ExecutionError> {
        let mut answer = answer;
        let installed = core.state.installed.clone();
        let rules = &installed.ordinary_actions.value().plan;
        loop {
            match self.phase {
                Phase::Preflight => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(&self.input.actor_id)
                        .and_then(|entity| entity.actor.as_ref())
                        .ok_or(ExecutionError::MissingActor)?;
                    let duplicate = self.input.commands.iter().enumerate().any(|(at, command)| {
                        self.input.commands[..at]
                            .iter()
                            .any(|before| before.envelope().id == command.envelope().id)
                    });
                    if !is_safe_record_id(&self.input.id)
                        || duplicate
                        || self
                            .input
                            .commands
                            .iter()
                            .any(|command| command.envelope().actor_id != self.input.actor_id)
                    {
                        self.refuse(&rules.invalid_identity)?;
                        continue;
                    }
                    let current = actor.agency.plan.as_ref();
                    self.basis_revision = current.map(|plan| plan.revision);
                    if self.basis_revision.unwrap_or(0) != self.input.expected_revision {
                        self.refuse(&rules.stale_plan)?;
                        continue;
                    }
                    if self.input.goal_id.as_ref().is_some_and(|id| {
                        !id.is_empty()
                            && !actor
                                .agency
                                .goals
                                .iter()
                                .any(|goal| goal.id == *id && goal.status == "active")
                    }) {
                        self.refuse(&rules.invalid_goal)?;
                        continue;
                    }
                    if self.input.commands.is_empty()
                        || self.input.commands.len() as u64 > installed.agency_limits.steps
                    {
                        self.refuse(&rules.step_limit)?;
                        continue;
                    }
                    // These core families are always trusted Source commands; an
                    // actual item/activity graph or unsupported parameter is never
                    // installed as a frontier to fail later after unrelated effects.
                    if self
                        .input
                        .commands
                        .iter()
                        .any(|command| !Self::valid_command(core, command))
                    {
                        self.refuse(&rules.invalid_command)?;
                        continue;
                    }
                    if current.is_some_and(|plan| {
                        plan.activity.is_some()
                            || plan.steps.iter().any(|step| step.activity_key.is_some())
                    }) || actor.agency.suspended_plan().is_some_and(|plan| {
                        plan.activity.is_some()
                            || plan.steps.iter().any(|step| step.activity_key.is_some())
                    }) || self.input.commands.iter().any(|command| {
                        command.envelope().cooperation.is_some()
                            || command.envelope().combat_help_id.is_some()
                            || matches!(
                                command,
                                NativeCommand::StatusEffect {
                                    resting_place_id: Some(_),
                                    ..
                                } | NativeCommand::StatusEffect {
                                    resting_bay: Some(_),
                                    ..
                                }
                            )
                    }) {
                        return Err(ExecutionError::UnsupportedFamily);
                    }
                    if self.input.mode == PlanMode::Enqueue
                        && current.is_some_and(|plan| {
                            !matches!(plan.status, PlanStatus::Completed | PlanStatus::Cancelled)
                        })
                    {
                        let plan = current.ok_or(ExecutionError::Invariant)?;
                        if plan.status == PlanStatus::Blocked {
                            self.refuse(&rules.plan_blocked)?;
                            continue;
                        }
                        if plan
                            .steps
                            .len()
                            .checked_add(self.input.commands.len())
                            .is_none_or(|n| n as u64 > installed.agency_limits.steps)
                            || (self.input.goal_id.is_some() && self.input.goal_id != plan.goal_id)
                        {
                            self.refuse(&rules.frontier_full)?;
                            continue;
                        }
                        self.install(core, true)?;
                        continue;
                    }
                    let kind = match self.input.mode {
                        PlanMode::Replace => Some(PlanControlKind::Stop),
                        PlanMode::Interrupt => Some(PlanControlKind::Suspend),
                        PlanMode::Enqueue => None,
                    };
                    if let Some(kind) = kind {
                        self.control = Some(PlanControlCursor::new(
                            &self.input.actor_id,
                            kind,
                            &self.budget,
                        )?);
                        self.phase = Phase::Control;
                    } else {
                        self.phase = Phase::Retire;
                    }
                }
                Phase::Control | Phase::Retire => {
                    if self.control.is_none() {
                        if core
                            .state
                            .physical
                            .entities
                            .get(&self.input.actor_id)
                            .and_then(|entity| entity.actor.as_ref())
                            .is_some_and(|actor| actor.agency.plan.is_some())
                        {
                            self.control = Some(PlanControlCursor::new(
                                &self.input.actor_id,
                                PlanControlKind::Retire,
                                &self.budget,
                            )?);
                        } else {
                            self.phase = Phase::Install;
                            continue;
                        }
                    }
                    let progress = self
                        .control
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .progress(core, answer.take())?;
                    if matches!(progress, PlanControlProgress::Personal) {
                        return Ok(PlanEditStep::Personal(
                            self.control
                                .as_ref()
                                .ok_or(ExecutionError::Invariant)?
                                .personal()?,
                        ));
                    }
                    let control = self.control.as_ref().ok_or(ExecutionError::Invariant)?;
                    if let Some(refusal) = control.refusal() {
                        let bytes = refusal.heap_bytes().ok_or(ExecutionError::Capacity)?;
                        self.reservation.resize(
                            self.reservation
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let result = refusal.clone();
                        self.outcome = Some(result);
                        self.phase = Phase::Done;
                        continue;
                    }
                    self.basis_revision = control.previous_revision().or(self.basis_revision);
                    self.control = None;
                    if self.phase == Phase::Control {
                        self.phase = Phase::Retire;
                    } else {
                        self.phase = Phase::Install;
                    }
                }
                Phase::Install => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.install(core, false)?;
                }
                Phase::Done => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    return Ok(PlanEditStep::Complete(
                        self.outcome.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
            }
        }
    }
}
