//! Reflection and consolidation each call Source finish(), including the
//! dream child before grouping. This shared boundary advances consequences
//! and sequence only for that successful transition, not duplicates/refusals.
use crate::events::WorldEvent;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::host::ByteBudget;

pub(super) fn finish_transition(
    core: &mut CoreMutation<'_>,
    checkpoint: &CandidateCheckpoint,
    actor: &str,
    events: &[WorldEvent],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    core.physical().reconcile_closed_coaching()?;
    crate::experience::advance_commitments(core, events, budget)?;
    core.state.physical.header.native_interval = None;
    core.state.physical.header.sequence = core
        .state
        .physical
        .header
        .sequence
        .checked_add(1)
        .filter(|next| *next <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    core.reconcile_command_semantics(checkpoint, actor)?;
    core.sync_sensory_changes()
}
