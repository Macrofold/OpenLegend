//! A command result becomes usable by plan dispatch only after its real child
//! transaction and Source finishInDraft consequence boundary have completed.
use super::Outcome;
use crate::events::WorldEvent;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::experience::MemoryAcquisitionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use std::mem::size_of;

pub(crate) struct PendingCommandCompletion {
    actor_id: String,
    command_id: String,
    outcome: Outcome,
    finalize: bool,
    sequence: u64,
    at: f64,
    exposure: Option<super::exposure::CommandExposure>,
    _reservation: ByteReservation,
}
impl PendingCommandCompletion {
    pub(super) fn new(
        core: &CoreMutation<'_>,
        actor_id: &str,
        command_id: &str,
        outcome: Outcome,
        finalize: bool,
        exposure: Option<super::exposure::CommandExposure>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.len(),
                command_id.len(),
                outcome.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id: actor_id.into(),
            command_id: command_id.into(),
            outcome,
            finalize,
            sequence: core.state.physical.header.sequence,
            at: core.state.physical.header.sim_time,
            exposure,
            _reservation: reservation,
        })
    }
}
/// Only the common finalizer creates this proof. A raw command outcome cannot
/// advance a plan frontier before rollback or its consequence reconciliation.
pub(crate) struct CompletedCommand(PendingCommandCompletion);
impl CompletedCommand {
    pub(crate) fn outcome(&self) -> &Outcome {
        &self.0.outcome
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.0.actor_id
    }
    pub(crate) fn command_id(&self) -> &str {
        &self.0.command_id
    }
}
pub(crate) fn complete_command_in_draft(
    core: &mut CoreMutation<'_>,
    child: CandidateCheckpoint,
    mut pending: PendingCommandCompletion,
    events: &[WorldEvent],
    budget: &ByteBudget,
) -> Result<CompletedCommand, MemoryAcquisitionError> {
    let reconcile = (|| -> Result<(), MemoryAcquisitionError> {
        if core.state.physical.header.sequence != pending.sequence
            || core.state.physical.header.sim_time != pending.at
        {
            return Err(ExecutionError::InvalidCheckpoint.into());
        }
        if pending.outcome.ok && pending.finalize {
            // An empty imported coaching owner still has the Source deletion
            // duty. Selected commands cannot create a lesson episode.
            core.physical().reconcile_closed_coaching()?;
            crate::experience::advance_commitments(core, events, budget)?;
            let next = core
                .state
                .physical
                .header
                .sequence
                .checked_add(1)
                .filter(|next| *next <= MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            core.state.physical.header.sequence = next;
            core.reconcile_command_semantics(&child, &pending.actor_id)?;
            core.sync_sensory_changes()?;
            if let Some(exposure) = pending.exposure.take() {
                exposure.reconcile(core, budget)?;
            }
        }
        Ok(())
    })();
    if let Err(error) = reconcile {
        core.journal.rollback_to(core.state, child)?;
        return Err(error);
    }
    if pending.outcome.ok {
        core.journal.keep(core.state, child)?;
    } else {
        core.journal.rollback_to(core.state, child)?;
    }
    pending.exposure = None;
    Ok(CompletedCommand(pending))
}
