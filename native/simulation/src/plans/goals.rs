//! One actor's private intentions. Declaring completion changes that intention;
//! it does not manufacture a physical achievement, memory or world occurrence.
use super::*;
use crate::execution::{CoreMutation, ExecutionError, PhysicalMutation};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::{FundedGoals, Goal};
use crate::text::JsText;
use crate::values::is_safe_record_id;
use std::mem::size_of;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum GoalOperation {
    Create,
    Revise,
    Pause,
    Resume,
    Complete,
    Abandon,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct GoalChange {
    pub operation: GoalOperation,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub goal_id: Option<String>,
    #[serde(deserialize_with = "crate::values::deserialize_nullable_safe_integer")]
    pub expected_revision: Option<u64>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub objective: Option<JsText>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub parent_id: Option<String>,
}
fn terminal(goal: &Goal) -> bool {
    matches!(goal.status.as_str(), "completed" | "abandoned")
}
fn outcome(ok: bool, message: &'static str) -> Outcome {
    Outcome {
        spent: None,
        outputs: None,
        ok,
        code: if ok { "goal-updated" } else { "invalid-goal" }.into(),
        message: message.into(),
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}
pub(crate) struct ChangedGoal {
    pub outcome: Outcome,
    _reservation: ByteReservation,
}
impl ChangedGoal {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self._reservation)
    }
}
fn result(
    ok: bool,
    message: &'static str,
    goal_id: Option<&str>,
    budget: &ByteBudget,
) -> Result<ChangedGoal, ExecutionError> {
    let mut reservation = budget.reserve(
        message
            .len()
            .checked_add(32)
            .and_then(|n| n.checked_add(goal_id.map_or(0, str::len)))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut value = outcome(ok, message);
    value.goal_id = goal_id.map(str::to_owned);
    reservation.resize(value.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(ChangedGoal {
        outcome: value,
        _reservation: reservation,
    })
}
pub(crate) fn change_goal(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    change: &GoalChange,
    id: &str,
    author: &str,
    budget: &ByteBudget,
) -> Result<ChangedGoal, ExecutionError> {
    let reject = |message| result(false, message, None, budget);
    let actor = core
        .state
        .physical
        .entities
        .get(actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?;
    let goals = &actor.agency.goals;
    let create = matches!(change.operation, GoalOperation::Create);
    if !is_safe_record_id(id)
        || change
            .goal_id
            .as_ref()
            .is_some_and(|id| !is_safe_record_id(id))
        || change
            .parent_id
            .as_ref()
            .is_some_and(|id| !is_safe_record_id(id))
    {
        return reject("Invalid goal mutation identity or reference.");
    }
    let index = goals
        .iter()
        .position(|goal| Some(&goal.id) == change.goal_id.as_ref());
    let goal = index.map(|at| &goals[at]);
    if if create {
        change.goal_id.is_some() || change.expected_revision.is_some()
    } else {
        goal.is_none_or(|goal| Some(goal.revision) != change.expected_revision)
    } {
        return reject("Goal identity or revision changed. Refresh this actor’s intentions.");
    }
    if matches!(
        change.operation,
        GoalOperation::Create | GoalOperation::Revise
    ) {
        if change
            .objective
            .as_ref()
            .is_none_or(|text| text.trim_is_empty() || text.units_len() > 500)
        {
            return reject("An objective needs 1–500 characters.");
        }
        if let Some(parent_id) = change.parent_id.as_ref().filter(|id| !id.is_empty()) {
            let Some(parent) = goals
                .iter()
                .find(|goal| &goal.id == parent_id)
                .filter(|goal| !terminal(goal))
            else {
                return reject("Parent must be a current goal of this actor.");
            };
            let self_id = if create {
                id
            } else {
                goal.ok_or(ExecutionError::Invariant)?.id.as_str()
            };
            // The source graph has at most the installed goal/history cap. A
            // bounded pointer walk detects the same repeated IDs without cloning
            // prose or retaining a second goal index.
            let _walk = budget.reserve((goals.len() + 1) * size_of::<&str>() * 2)?;
            let mut seen = Vec::with_capacity(goals.len() + 1);
            seen.push(self_id);
            let mut next = Some(parent);
            while let Some(parent) = next {
                if seen.contains(&parent.id.as_str()) {
                    return reject("Goals cannot contain parent cycles.");
                }
                seen.push(parent.id.as_str());
                next = parent
                    .parent_id
                    .as_ref()
                    .and_then(|id| goals.iter().find(|goal| &goal.id == id));
            }
        }
    } else if change.objective.is_some() || change.parent_id.is_some() {
        return reject("Status changes do not rewrite the objective or parent.");
    }
    let limits = &core.state.installed.agency_limits;
    if (create || matches!(change.operation, GoalOperation::Resume))
        && goal.is_none_or(terminal)
        && goals.iter().filter(|goal| !terminal(goal)).count() as u64 >= limits.goals
    {
        return reject(
            "Eight active/paused goals are already retained. Explicitly complete or abandon one first.",
        );
    }
    let mut remove = None;
    if actor.agency.revision >= crate::identity::MAX_SAFE_INTEGER
        || (!create && goal.is_some_and(|goal| goal.revision >= crate::identity::MAX_SAFE_INTEGER))
    {
        return reject("Goal revisions are exhausted; the previous intentions were retained.");
    }
    if create {
        if goals.iter().any(|goal| goal.id == id) {
            return reject("Goal identity already exists.");
        }
        if goals.len() as u64
            >= limits
                .goals
                .checked_add(limits.goal_history)
                .ok_or(ExecutionError::Capacity)?
        {
            remove = goals.iter().position(|goal| {
                terminal(goal)
                    && actor
                        .agency
                        .plan
                        .as_ref()
                        .and_then(|plan| plan.goal_id.as_ref())
                        != Some(&goal.id)
                    && actor
                        .agency
                        .suspended_plan()
                        .and_then(|plan| plan.goal_id.as_ref())
                        != Some(&goal.id)
                    && !goals
                        .iter()
                        .any(|child| child.parent_id.as_ref() == Some(&goal.id))
            });
            if remove.is_none() {
                return reject("Goal history is full of referenced goals.");
            }
        }
    }
    let old_heap = goals.heap_bytes().ok_or(ExecutionError::Capacity)?;
    let extra = heap_sum([
        id.len().checked_mul(3).ok_or(ExecutionError::Capacity)?,
        author.len(),
        change
            .objective
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(4)
            .ok_or(ExecutionError::Capacity)?,
        change
            .parent_id
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        128,
        (goals.len() + 1)
            .checked_mul(size_of::<Goal>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(
        old_heap
            .checked_add(extra)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let result = result(
        true,
        "Private intention updated; no physical achievement is implied.",
        Some(if create {
            id
        } else {
            goal.ok_or(ExecutionError::Invariant)?.id.as_str()
        }),
        budget,
    )?;
    let mut after = Vec::with_capacity(goals.len() + usize::from(create));
    after.extend(goals.iter().cloned());
    if create {
        if let Some(index) = remove {
            after.remove(index);
        }
        after.push(Goal {
            id: id.into(),
            revision: 0,
            objective: change
                .objective
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .trimmed(),
            status: "active".into(),
            parent_id: change.parent_id.clone(),
            author: author.into(),
            source_id: id.into(),
            completion: None,
        });
    } else {
        let goal = after
            .get_mut(index.ok_or(ExecutionError::Invariant)?)
            .ok_or(ExecutionError::Invariant)?;
        match change.operation {
            GoalOperation::Revise => {
                goal.objective = change
                    .objective
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .trimmed();
                goal.parent_id = change.parent_id.clone();
            }
            GoalOperation::Pause => {
                goal.status = "paused".into();
                goal.completion = None;
            }
            GoalOperation::Resume => {
                goal.status = "active".into();
                goal.completion = None;
            }
            GoalOperation::Complete => {
                goal.status = "completed".into();
                goal.completion = Some("actor-declared".into());
            }
            GoalOperation::Abandon => {
                goal.status = "abandoned".into();
                goal.completion = None;
            }
            GoalOperation::Create => return Err(ExecutionError::Invariant),
        }
        goal.revision = goal
            .revision
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        goal.author = author.into();
        goal.source_id = id.into();
    }
    let funded = FundedGoals::new(after, storage, budget)?;
    let mut mutation = PhysicalMutation {
        state: &mut core.state.physical,
        journal: &mut core.journal.physical,
    };
    mutation.replace_goals(actor_id, funded, budget)?;
    mutation.advance_agency_revision(actor_id)?;
    Ok(result)
}
