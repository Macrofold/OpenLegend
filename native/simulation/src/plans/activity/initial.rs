//! The Source requested-activity envelope, before any plan/control mutation.
//! World-owned callers supply the actual name, root and bindings; this owner
//! neither authors a travel graph nor grants its physical command admission.
use super::{ActivityExecution, ActivityFrame, RequestedActivity};
use crate::activity::ActivityLimits;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::simulation::InstalledWorld;
use crate::text::JsText;
use indexmap::IndexMap;
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum RequestedActivityInitialError {
    /// Source requestedActivityProblem checks the original name before trim.
    /// Its caller retains ownership of the actual invalid-bindings outcome.
    InvalidName,
    Execution(ExecutionError),
}
impl From<ExecutionError> for RequestedActivityInitialError {
    fn from(error: ExecutionError) -> Self {
        Self::Execution(error)
    }
}

impl ActivityExecution {
    /// Build the current storage envelope from the actor's admitted learning.
    /// It owns an independently funded copy of the compiled remaining leaves and remembered bindings until the existing plan mutation takes it. The sequence still
    /// needs ordinary first-command admission, progress and withdrawal checks.
    pub(crate) fn initial_learned_speech(
        method: &crate::activity::LearnedSpeech<'_>,
        budget: &ByteBudget,
    ) -> Result<(Self, ByteReservation), ExecutionError> {
        let bytes = heap_sum([
            size_of::<Self>(),
            method
                .children()
                .len()
                .checked_mul(size_of::<ActivityFrame>())
                .ok_or(ExecutionError::Capacity)?,
            method
                .children()
                .iter()
                .try_fold(0_usize, |n, child| n.checked_add(child.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?,
            method
                .bindings()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            method.id().len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut pending = Vec::new();
        pending
            .try_reserve_exact(method.children().len())
            .map_err(|_| ExecutionError::Capacity)?;
        pending.extend(method.children().iter().rev().map(|node| ActivityFrame {
            node: node.clone_within_heap_bound(),
            iteration: 0,
            started_at: None,
        }));
        let value = Self {
            cooperation: None,
            combat_help_id: None,
            human_initiated: None,
            method_id: Some(method.id().to_owned()),
            request: None,
            completed_units: None,
            bindings: method.bindings().clone_within_heap_bound(),
            target_episodes: SqlCell::Object(IndexMap::new()),
            pending,
            outputs: SqlCell::Object(IndexMap::new()),
            serial: 0,
            processed: 1,
            archived_steps: None,
            active_key: None,
            cancelled_keys: None,
            reason: None,
            control: None,
            attempts: None,
            last_attempt_id: None,
            spent: None,
            interrupted: None,
            terminal: None,
        };
        Ok((value, storage))
    }

    /// Source startRequestedActivity initializes this point-bound single leaf
    /// with no invocation origin/control/quantity fields. Keep the returned
    /// allocation until RequestedActivityCursor has admitted its owned input.
    /// That cursor remains the complete grammar/current-cut/choice owner.
    pub(crate) fn initial_requested_single_invoke(
        name: &JsText,
        root: &SqlCell,
        bindings: &SqlCell,
        limits: &ActivityLimits,
        world: &InstalledWorld,
        budget: &ByteBudget,
    ) -> Result<(Self, ByteReservation), RequestedActivityInitialError> {
        if name.trim_is_empty() || name.units_len() as u64 > limits.text {
            return Err(RequestedActivityInitialError::InvalidName);
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            size_of::<ActivityFrame>(),
            root.heap_bytes()
                .and_then(|n| n.checked_mul(2))
                .ok_or(ExecutionError::Capacity)?,
            bindings.heap_bytes().ok_or(ExecutionError::Capacity)?,
            name.borrowed()
                .trimmed()
                .storage_bound()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget
            .reserve(bytes)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut pending = Vec::new();
        pending
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        pending.push(ActivityFrame {
            node: root.clone_within_heap_bound(),
            iteration: 0,
            started_at: None,
        });
        let value = Self {
            cooperation: None,
            combat_help_id: None,
            human_initiated: None,
            method_id: None,
            request: Some(RequestedActivity {
                name: name.trimmed(),
                root: root.clone_within_heap_bound(),
                chosen_purpose: None,
                quantity: None,
            }),
            completed_units: None,
            bindings: bindings.clone_within_heap_bound(),
            target_episodes: SqlCell::Object(IndexMap::new()),
            pending,
            outputs: SqlCell::Object(IndexMap::new()),
            serial: 0,
            processed: 0,
            archived_steps: None,
            active_key: None,
            cancelled_keys: None,
            reason: None,
            control: None,
            attempts: None,
            last_attempt_id: None,
            spent: None,
            interrupted: None,
            terminal: None,
        };
        value.single_invoke()?.movement_point(world)?;
        // captureActivityTargets traverses actual command entity fields. A
        // selected movement leaf with only a point role has no entity pin;
        // other bindings must join that owner instead of receiving empty pins.
        let retained = value
            .heap_bytes()
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .filter(|n| *n <= bytes)
            .ok_or(ExecutionError::Invariant)?;
        storage
            .resize(retained)
            .map_err(|_| ExecutionError::Capacity)?;
        Ok((value, storage))
    }
}
