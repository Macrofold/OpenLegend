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
    pub(crate) fn single_step_id(
        &self,
        plan_id: &str,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        self.single_invoke()?;
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
    let Some(suffix) = envelope
        .id
        .strip_prefix(&plan.id)
        .and_then(|suffix| suffix.strip_prefix(":step:"))
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
        && !suffix.starts_with('0')
        && suffix.bytes().all(|byte| byte.is_ascii_digit())
        && suffix.parse::<u64>() == Ok(serial)
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
        && point.get("x").and_then(SqlCell::as_f64) == Some(destination.x)
        && point.get("y").and_then(SqlCell::as_f64) == Some(destination.y)
        && point.get("z").and_then(SqlCell::as_f64) == Some(destination.z)
        && point.get("surfaceId").and_then(SqlCell::as_str) == Some(destination.surface_id.as_str())
}

/// Append the real bound leaf, without dispatch, result/evidence creation or a
/// revision increment. Source increments the dispatch revision in its common
/// plan owner, not when activityFrontier appends this queued step.
pub(crate) fn append_single_invoke(
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
    let invocation = execution.single_invoke()?;
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
        || execution.pending.len() != 1
        || maximum == 0
        || current.steps.len() > maximum
        || current
            .steps
            .iter()
            .any(|step| matches!(step.status, StepStatus::Queued | StepStatus::Running))
        || execution
            .cancelled_keys
            .as_ref()
            .is_some_and(|keys| keys.iter().any(|key| key == invocation.key))
        || !command_matches(&invocation, current, actor, &command, serial)
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
        .and_then(|n| n.checked_add(invocation.key.heap_bytes()?.checked_mul(2)?))
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
        let invocation = current.activity.as_ref().unwrap().single_invoke()?;
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
        (invocation.key.clone(), next_history)
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
