//! Requested single-leaf control feeds the existing plan/command executor.
//! Source: activity-execution.ts activityFrontier/cancelActivityCommands and
//! agency.ts finishAction. Other AST/control families stay explicitly closed.
use super::ActivityExecution;
use crate::commands::{NativeCommand, Outcome};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::plans::{ActorPlan, PlanStatus, PlanStep, StepStatus};
use crate::records::SqlCell;
use crate::text::JsText;
use indexmap::IndexMap;
use std::fmt::Write as _;
use std::mem::size_of;

/// Borrowed syntax only: the installed command owner binds and admits the
/// actual leaf. This descriptor grants neither physical nor private authority.
pub(crate) struct SingleInvoke<'a> {
    pub execution: &'a ActivityExecution,
    pub key: &'a JsText,
    pub name: &'a JsText,
    pub family: &'a str,
    pub args: &'a IndexMap<String, SqlCell>,
}

impl<'a> SingleInvoke<'a> {
    /// Resolve the sole authored movement argument against the selected work
    /// rules. New requests, command binding and cold validation share this read.
    pub(crate) fn movement_point(
        &self,
        world: &crate::simulation::InstalledWorld,
    ) -> Result<&'a SqlCell, ExecutionError> {
        if !world
            .ordinary_actions
            .value()
            .plan
            .supports_requested_movement(self.family)
            || self.args.len() != 1
            || self.execution.bindings.object_len() != Some(1)
        {
            return Err(unsupported());
        }
        let role = self
            .args
            .get("destination")
            .filter(|argument| argument.object_len() == Some(1))
            .and_then(|argument| argument.get("role"))
            .and_then(SqlCell::as_text)
            .filter(|role| crate::values::is_safe_record_text(role))
            .ok_or_else(unsupported)?;
        let point = self
            .execution
            .bindings
            .get_text(role)
            .ok_or_else(unsupported)?;
        super::point(point, true).map_err(|_| unsupported())?;
        Ok(point)
    }
}

/// An executable saved frontier uses the same finite binding as a new step.
/// Reject a mutated actor, destination or step instead of regenerating it.
pub(crate) fn validate_installed_activity(
    plan: &ActorPlan,
    actor: &str,
    state: &crate::simulation::SimulationState,
) -> Result<(), ExecutionError> {
    require_supported_activity(plan)?;
    let Some(execution) = &plan.activity else {
        return Ok(());
    };
    if execution.method_id.is_some() {
        return validate_saved_learned_plan(state, plan, execution, actor);
    }
    let invocation = execution.single_invoke()?;
    invocation.movement_point(&state.installed)?;
    if execution.cooperation.is_some() || execution.combat_help_id.is_some() {
        return Err(unsupported());
    }
    if plan
        .steps
        .iter()
        .filter(|step| step.activity_key.is_some())
        .any(|step| !command_matches(&invocation, plan, actor, &step.command, execution.serial))
    {
        return Err(unsupported());
    }
    Ok(())
}

fn unsupported() -> ExecutionError {
    ExecutionError::UnsupportedFamily
}
fn plan<'a>(core: &'a CoreMutation<'_>, actor: &str) -> Result<&'a ActorPlan, ExecutionError> {
    core.state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.agency.plan.as_ref())
        .ok_or(ExecutionError::Invariant)
}

/// The same finite capability boundary is used before readiness, editing,
/// cancellation and resumption; copying an inverse does not open execution.
pub(crate) fn require_supported_activity(plan: &ActorPlan) -> Result<(), ExecutionError> {
    if let Some(execution) = &plan.activity {
        if execution.method_id.is_some() {
            return execution.require_learned_speech();
        }
        let invocation = execution.single_invoke()?;
        if plan.steps.iter().any(|step| {
            step.activity_key.as_ref().is_some_and(|key| {
                key != invocation.key || !matches!(step.command, NativeCommand::Move { .. })
            })
        }) {
            return Err(unsupported());
        }
    } else if plan.steps.iter().any(|step| step.activity_key.is_some()) {
        return Err(unsupported());
    }
    Ok(())
}

impl ActivityExecution {
    /// Only the fixed, untargeted, already-bound speech sequence is opened
    /// here. Cold installation and the actual frontier own exact semantic
    /// checks; pause, undo and replay need only the admitted execution class.
    fn require_learned_speech(&self) -> Result<(), ExecutionError> {
        if self.method_id.is_none()
            || self.request.is_some()
            || self.control.is_some()
            || self.cooperation.is_some()
            || self.combat_help_id.is_some()
            || self.human_initiated.is_some()
            || self.completed_units.is_some()
            || self.attempts.is_some()
            || self.last_attempt_id.is_some()
            || self.spent.is_some()
            || self.interrupted.is_some()
            || self.terminal.is_some()
            || self.target_episodes.object_len() != Some(0)
            || self.outputs.as_object().is_none()
        {
            return Err(unsupported());
        }
        Ok(())
    }

    pub(crate) fn pending_speech(
        &self,
    ) -> Result<Option<crate::activity::LearnedSpeechLeaf<'_>>, ExecutionError> {
        self.require_learned_speech()?;
        self.pending
            .last()
            .map(|frame| {
                if frame.iteration != 0 || frame.started_at.is_some() {
                    return Err(unsupported());
                }
                crate::activity::speech_leaf(&frame.node, &self.bindings).ok_or_else(unsupported)
            })
            .transpose()
    }

    pub(crate) fn current_speech(
        &self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(method) = self.method_id.as_deref() else {
            return Ok(true);
        };
        Ok(
            crate::activity::current_learned_speech(state, actor, method, budget)?
                .is_some_and(|current| current.bindings() == &self.bindings),
        )
    }

    pub(crate) fn required_pending_key(&self) -> Result<&JsText, ExecutionError> {
        if self.method_id.is_some() {
            return self
                .pending_speech()?
                .map(|leaf| leaf.key)
                .ok_or_else(unsupported);
        }
        self.pending_single_invoke()?
            .map(|leaf| leaf.key)
            .ok_or_else(unsupported)
    }

    fn matches_pending(
        &self,
        plan: &ActorPlan,
        actor: &str,
        command: &NativeCommand,
        serial: u64,
    ) -> Result<bool, ExecutionError> {
        if self.method_id.is_some() {
            let leaf = self.pending_speech()?.ok_or_else(unsupported)?;
            return Ok(matches_speech(plan, actor, command, serial, &leaf));
        }
        Ok(command_matches(
            &self.single_invoke()?,
            plan,
            actor,
            command,
            serial,
        ))
    }

    /// This first executable shape has no counted/finite control, learned
    /// support, quantity or compound nodes. Their complete saved envelopes are
    /// still copied by the inverse owner, never treated as this smaller shape.
    /// Canonical structure and installed leaf admission remain their existing
    /// owners; this is the narrower executor capability check, not a validator.
    pub(crate) fn single_invoke(&self) -> Result<SingleInvoke<'_>, ExecutionError> {
        let request = self.request.as_ref().ok_or_else(unsupported)?;
        let node = &request.root;
        if self.method_id.is_some()
            || self.control.is_some()
            || request.quantity.is_some()
            || self.completed_units.is_some()
            || self.attempts.is_some()
            || self.spent.is_some()
            || self.last_attempt_id.is_some()
            || self.interrupted.is_some()
            || self.terminal.is_some()
            || node.get("kind").and_then(SqlCell::as_str) != Some("invoke")
            || node
                .get("requirements")
                .is_some_and(|v| v.as_array().is_none_or(|v| !v.is_empty()))
            || node
                .get("outputs")
                .is_some_and(|v| v.as_array().is_none_or(|v| !v.is_empty()))
            || self.target_episodes.object_len() != Some(0)
        {
            return Err(unsupported());
        }
        let key = node
            .get("key")
            .and_then(SqlCell::as_text)
            .ok_or_else(unsupported)?;
        let name = node
            .get("name")
            .and_then(SqlCell::as_text)
            .ok_or_else(unsupported)?;
        let family = node
            .get("command")
            .and_then(SqlCell::as_str)
            .ok_or_else(unsupported)?;
        let args = node
            .get("args")
            .and_then(SqlCell::as_object)
            .ok_or_else(unsupported)?;
        let output_count = self.outputs.object_len().ok_or_else(unsupported)?;
        if output_count > 1
            || output_count == 1
                && self
                    .outputs
                    .get_text(key)
                    .and_then(SqlCell::as_array)
                    .is_none_or(|outputs| !outputs.is_empty())
            || self.pending.len() > 1
            || self.pending.iter().any(|frame| {
                frame.node != request.root || frame.iteration != 0 || frame.started_at.is_some()
            })
        {
            return Err(unsupported());
        }
        Ok(SingleInvoke {
            execution: self,
            key,
            name,
            family,
            args,
        })
    }

    pub(crate) fn pending_single_invoke(&self) -> Result<Option<SingleInvoke<'_>>, ExecutionError> {
        let invocation = self.single_invoke()?;
        Ok((!self.pending.is_empty()).then_some(invocation))
    }

    /// The command binder keeps this allocation alive until its independently
    /// funded command is handed to append_single_invoke. No ID is issued here.
    pub(crate) fn next_step_id(
        &self,
        plan_id: &str,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        self.required_pending_key()?;
        let serial = self
            .serial
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let bytes = plan_id
            .len()
            .checked_add(6 + 20)
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut id = String::with_capacity(bytes);
        id.push_str(plan_id);
        id.push_str(":step:");
        write!(id, "{serial}").map_err(|_| ExecutionError::Invariant)?;
        Ok((id, storage))
    }
}

fn command_matches(
    invocation: &SingleInvoke<'_>,
    plan: &ActorPlan,
    actor: &str,
    command: &NativeCommand,
    serial: u64,
) -> bool {
    let NativeCommand::Move {
        envelope,
        destination,
    } = command
    else {
        return false;
    };
    let Some(role) = invocation
        .args
        .get("destination")
        .and_then(|value| value.get("role"))
        .and_then(SqlCell::as_text)
    else {
        return false;
    };
    let Some(point) = invocation.execution.bindings.get_text(role) else {
        return false;
    };
    invocation.args.len() == 1
        && invocation.family == command.kind()
        && command_serial(plan, command) == Some(serial)
        && envelope.actor_id == actor
        && envelope.purpose.as_ref() == Some(invocation.name)
        && envelope.chosen_purpose
            == invocation
                .execution
                .request
                .as_ref()
                .unwrap()
                .chosen_purpose
        && envelope.cooperation == invocation.execution.cooperation
        && envelope.combat_help_id == invocation.execution.combat_help_id
        && envelope.human_initiated == invocation.execution.human_initiated
        && destination.matches_cell(point)
}

fn command_serial(plan: &ActorPlan, command: &NativeCommand) -> Option<u64> {
    let suffix = command
        .envelope()
        .id
        .strip_prefix(&plan.id)?
        .strip_prefix(":step:")?;
    if suffix.starts_with('0') || !suffix.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    suffix.parse().ok()
}

fn matches_speech(
    plan: &ActorPlan,
    actor: &str,
    command: &NativeCommand,
    serial: u64,
    leaf: &crate::activity::LearnedSpeechLeaf<'_>,
) -> bool {
    command.learned_speech_fields() == Some((leaf.purpose, leaf.text))
        && command.envelope().actor_id == actor
        && command_serial(plan, command) == Some(serial)
}

/// Reconnect saved leaf IDs to the original immutable definition after the
/// library exists. A revoked owner can still reopen; the live ready path stops
/// any unfinished work, while already performed steps retain their receipts.
fn validate_saved_learned_plan(
    state: &crate::simulation::SimulationState,
    plan: &ActorPlan,
    execution: &ActivityExecution,
    actor: &str,
) -> Result<(), ExecutionError> {
    let method = crate::activity::stored_learned_speech(
        state,
        execution.method_id.as_deref().ok_or_else(unsupported)?,
        &execution.bindings,
    )
    .ok_or_else(unsupported)?;
    let serial = usize::try_from(execution.serial).map_err(|_| unsupported())?;
    let children = method.children();
    let pending = children.get(serial..).ok_or_else(unsupported)?;
    let archived =
        usize::try_from(execution.archived_steps.unwrap_or(0)).map_err(|_| unsupported())?;
    if (plan.status != PlanStatus::Cancelled || !execution.pending.is_empty())
        && (pending.len() != execution.pending.len()
            || pending
                .iter()
                .rev()
                .zip(&execution.pending)
                .any(|(node, frame)| {
                    *node != frame.node || frame.iteration != 0 || frame.started_at.is_some()
                }))
        || execution.processed != execution.serial + 1
        || archived.checked_add(plan.steps.len()) != Some(serial)
        || (plan.status == PlanStatus::Completed && !pending.is_empty())
        || plan.steps.iter().enumerate().any(|(index, step)| {
            let position = archived + index;
            let Some(leaf) = method.leaf(&children[position]) else {
                return true;
            };
            step.activity_key.as_ref() != Some(leaf.key)
                || !matches_speech(plan, actor, &step.command, (position + 1) as u64, &leaf)
        })
        || execution.outputs.as_object().is_none_or(|outputs| {
            outputs.iter().any(|(key, value)| {
                value.as_array().is_none_or(|outputs| !outputs.is_empty())
                    || !children[..serial]
                        .iter()
                        .any(|node| node.get("key").and_then(SqlCell::as_str) == Some(key.as_str()))
            })
        })
    {
        return Err(unsupported());
    }
    Ok(())
}

/// Append the real bound leaf, without dispatch, result/evidence creation or a
/// revision increment. Source increments the dispatch revision in its common
/// plan owner, not when activityFrontier appends this queued step.
pub(crate) fn append_invoke(
    core: &mut CoreMutation<'_>,
    actor: &str,
    command: NativeCommand,
) -> Result<usize, ExecutionError> {
    let maximum = usize::try_from(core.state.installed.agency_limits.steps)
        .map_err(|_| ExecutionError::Capacity)?;
    let history_maximum = usize::try_from(core.state.installed.agency_limits.history)
        .map_err(|_| ExecutionError::Capacity)?;
    let current = plan(core, actor)?;
    let execution = current.activity.as_ref().ok_or_else(unsupported)?;
    let key = execution.required_pending_key()?;
    let serial = execution
        .serial
        .checked_add(1)
        .filter(|n| *n <= core.state.activity.limits.expanded_work)
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let processed = execution
        .processed
        .checked_add(1)
        .filter(|n| *n <= core.state.activity.limits.expanded_work)
        .ok_or(ExecutionError::UnsupportedFamily)?;
    if current.status != PlanStatus::Active
        || maximum == 0
        || current.steps.len() > maximum
        || current
            .steps
            .iter()
            .any(|step| matches!(step.status, StepStatus::Queued | StepStatus::Running))
        || execution
            .cancelled_keys
            .as_ref()
            .is_some_and(|keys| keys.contains(key))
        || !execution.matches_pending(current, actor, &command, serial)?
    {
        return Err(unsupported());
    }
    let archive = current.steps.len() == maximum;
    let archived_steps = if archive {
        Some(
            execution
                .archived_steps
                .unwrap_or(0)
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?,
        )
    } else {
        execution.archived_steps
    };
    let history = &core
        .state
        .physical
        .entities
        .get(actor)
        .unwrap()
        .actor
        .as_ref()
        .unwrap()
        .agency
        .history;
    let history_heap = if archive {
        history
            .heap_bytes()
            .and_then(|n| n.checked_add(current.steps[0].heap_bytes()?))
    } else {
        Some(0)
    }
    .ok_or(ExecutionError::Capacity)?;
    let growth = command
        .heap_bytes()
        .and_then(|n| n.checked_add(command.envelope().id.len()))
        .and_then(|n| n.checked_add(key.heap_bytes()?.checked_mul(2)?))
        .and_then(|n| {
            n.checked_add(if archive {
                0
            } else {
                (current.steps.len() + 1).checked_mul(2 * size_of::<PlanStep>())?
            })
        })
        .and_then(|n| n.checked_add(history_heap))
        .and_then(|n| {
            n.checked_add(if archive {
                (history.len() + 1).checked_mul(size_of::<PlanStep>())?
            } else {
                0
            })
        })
        .ok_or(ExecutionError::Capacity)?;
    core.physical().reserve_plan_growth(growth)?;
    let (key, next_history) = {
        let current = plan(core, actor)?;
        let key = current.activity.as_ref().unwrap().required_pending_key()?;
        let next_history = if archive {
            let history = &core
                .state
                .physical
                .entities
                .get(actor)
                .unwrap()
                .actor
                .as_ref()
                .unwrap()
                .agency
                .history;
            let skip = (history.len() + 1).saturating_sub(history_maximum);
            Some(
                history
                    .iter()
                    .chain(std::iter::once(&current.steps[0]))
                    .skip(skip)
                    .cloned()
                    .collect(),
            )
        } else {
            None
        };
        (key.clone(), next_history)
    };
    if let Some(history) = next_history {
        core.physical().replace_plan_history(actor, history)?;
    }
    let mut physical = core.physical();
    let current = physical
        .plan_mut(actor)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    current
        .steps
        .try_reserve_exact(if archive { 0 } else { 1 })
        .map_err(|_| ExecutionError::Capacity)?;
    if archive {
        current.steps.remove(0);
    }
    let id = command.envelope().id.clone();
    current.steps.push(PlanStep {
        activity_key: Some(key.clone()),
        id,
        command,
        target_episodes: Some(IndexMap::new()),
        status: StepStatus::Queued,
        action_id: None,
        outcome: None,
        result_evidence: None,
    });
    let execution = current.activity.as_mut().ok_or(ExecutionError::Invariant)?;
    execution.pending.pop().ok_or(ExecutionError::Invariant)?;
    execution.serial = serial;
    execution.processed = processed;
    execution.active_key = Some(key);
    execution.archived_steps = archived_steps;
    execution.reason = None;
    Ok(current.steps.len() - 1)
}

/// The common action finisher owns the actual result/evidence/step/revision.
/// Call only for an actual activityKey: this adds its output and failure reason.
/// A failed ordinary prefix has no key and must not call this helper; the common
/// finisher records its activity reason without inventing a primitive output.
pub(crate) fn record_single_result(
    core: &mut CoreMutation<'_>,
    actor: &str,
    index: usize,
    result: &Outcome,
) -> Result<(), ExecutionError> {
    let current = plan(core, actor)?;
    let step = current.steps.get(index).ok_or(ExecutionError::Invariant)?;
    let execution = current.activity.as_ref().ok_or_else(unsupported)?;
    if execution.method_id.is_some() {
        return record_speech_result(core, actor, index, result);
    }
    let invocation = execution.single_invoke()?;
    if step.status != StepStatus::Running
        || step.activity_key.as_ref() != Some(invocation.key)
        || !matches!(step.command, NativeCommand::Move { .. })
        || result
            .outputs
            .as_ref()
            .is_some_and(|outputs| !outputs.is_empty())
    {
        return Err(unsupported());
    }
    let encoded = crate::encoding::json_record_len(invocation.key)
        .map_err(|_| ExecutionError::Invariant)?
        .checked_add(5)
        .ok_or(ExecutionError::Capacity)?;
    // One declared Move key replaces only its own actual empty output entry.
    // Cover the member vector, chosen backing, exact-key derived encoding and
    // temporary scalar quote before constructing the replacement.
    let growth = map_storage::<String, SqlCell>(1)
        .and_then(|n| n.checked_add(2 * size_of::<(JsText, SqlCell)>()))
        .and_then(|n| n.checked_add(invocation.key.heap_bytes()?))
        .and_then(|n| n.checked_add(encoded.checked_mul(4)?))
        .and_then(|n| n.checked_add(4 * size_of::<usize>()))
        .and_then(|n| {
            n.checked_add(if result.ok {
                0
            } else {
                result.message.heap_bytes()?
            })
        })
        .ok_or(ExecutionError::Capacity)?;
    core.physical().reserve_plan_growth(growth)?;
    let key = plan(core, actor)?
        .activity
        .as_ref()
        .unwrap()
        .single_invoke()?
        .key
        .clone();
    let outputs = SqlCell::from_text_members(vec![(key, SqlCell::Array(Vec::new()))])
        .map_err(|_| ExecutionError::Invariant)?;
    let mut physical = core.physical();
    let execution = physical
        .plan_mut(actor)?
        .as_mut()
        .and_then(|p| p.activity.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    // Present empty is the actual Move result, distinct from an absent entry.
    execution.outputs = outputs;
    if !result.ok {
        execution.reason = Some(result.message.clone());
    }
    Ok(())
}

fn record_speech_result(
    core: &mut CoreMutation<'_>,
    actor: &str,
    index: usize,
    result: &Outcome,
) -> Result<(), ExecutionError> {
    let current = plan(core, actor)?;
    let step = current.steps.get(index).ok_or(ExecutionError::Invariant)?;
    let key = step
        .activity_key
        .as_ref()
        .and_then(JsText::as_unicode)
        .ok_or_else(unsupported)?;
    if step.status != StepStatus::Running
        || step.command.learned_speech_fields().is_none()
        || result
            .outputs
            .as_ref()
            .is_some_and(|outputs| !outputs.is_empty())
    {
        return Err(unsupported());
    }
    let current_size = current
        .activity
        .as_ref()
        .and_then(|value| value.outputs.object_len())
        .ok_or_else(unsupported)?;
    let growth = map_storage::<String, SqlCell>(current_size + 1)
        .and_then(|n| n.checked_add(key.len()))
        .and_then(|n| {
            n.checked_add(if result.ok {
                0
            } else {
                result.message.heap_bytes()?
            })
        })
        .ok_or(ExecutionError::Capacity)?;
    core.physical().reserve_plan_growth(growth)?;
    let key = plan(core, actor)?.steps[index]
        .activity_key
        .as_ref()
        .and_then(JsText::as_unicode)
        .ok_or(ExecutionError::Invariant)?
        .to_owned();
    let mut physical = core.physical();
    let execution = physical
        .plan_mut(actor)?
        .as_mut()
        .and_then(|plan| plan.activity.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    let SqlCell::Object(outputs) = &mut execution.outputs else {
        return Err(ExecutionError::Invariant);
    };
    outputs
        .try_reserve(1)
        .map_err(|_| ExecutionError::Capacity)?;
    if outputs.insert(key, SqlCell::Array(Vec::new())).is_some() {
        return Err(ExecutionError::Invariant);
    }
    if !result.ok {
        execution.reason = Some(result.message.clone());
    }
    Ok(())
}

/// Selected cancellation never regenerates the one primitive on resumption.
/// The ordinary control owner still stops actions and publishes its real result.
pub(crate) fn cancel_single_invoke(
    core: &mut CoreMutation<'_>,
    actor: &str,
) -> Result<(), ExecutionError> {
    let execution = plan(core, actor)?
        .activity
        .as_ref()
        .ok_or_else(unsupported)?;
    let invocation = execution.single_invoke()?;
    if execution
        .cancelled_keys
        .as_ref()
        .is_some_and(|keys| keys.iter().any(|key| key == invocation.key))
    {
        return Ok(());
    }
    let growth = invocation
        .key
        .heap_bytes()
        .and_then(|n| n.checked_mul(2))
        .and_then(|n| n.checked_add(2 * size_of::<JsText>()))
        .ok_or(ExecutionError::Capacity)?;
    core.physical().reserve_plan_growth(growth)?;
    let key = plan(core, actor)?
        .activity
        .as_ref()
        .unwrap()
        .single_invoke()?
        .key
        .clone();
    let mut physical = core.physical();
    let execution = physical
        .plan_mut(actor)?
        .as_mut()
        .and_then(|p| p.activity.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    let keys = execution.cancelled_keys.get_or_insert_with(Vec::new);
    keys.try_reserve_exact(1)
        .map_err(|_| ExecutionError::Capacity)?;
    keys.push(key.clone());
    keys.sort();
    execution.pending.clear();
    if execution.active_key.as_ref() == Some(&key) {
        execution.active_key = None;
    }
    Ok(())
}
