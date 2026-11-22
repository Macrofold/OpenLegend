//! Existing current worlds reopen paused and reconcile hot-event progression
//! before first disclosure. Prepared creation has its separate activation path.
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use crate::runtime::RestoreBinding;
use std::mem::size_of;

/// Reopening an existing current world reconciles its installed hot events once.
/// The completion is not an event replay: Session applies the same sparse host
/// journal used by live speech and keeps old events out of publication/history.
pub(super) struct StartupCursor {
    storage: Option<ByteReservation>,
    protected: bool,
}
pub(crate) struct CompletedStartup {
    pub(super) protected: bool,
    pub(super) outcome: crate::commands::Outcome,
    _storage: ByteReservation,
}
impl StartupCursor {
    pub(super) fn new(
        core: &mut CoreMutation<'_>,
        owners: Option<&[RestoreBinding]>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let protected = owners.is_some();
        if let Some(owners) = owners {
            install_owners(core, owners)?;
        }
        Ok(Self {
            protected,
            storage: Some(
                budget
                    .reserve(size_of::<Self>() + size_of::<CompletedStartup>() + "startup".len())?,
            ),
        })
    }
    pub(super) fn complete(
        &mut self,
        core: &mut crate::execution::CoreMutation<'_>,
    ) -> Result<CompletedStartup, crate::time::AdvanceError> {
        let storage = self
            .storage
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        // Source current-world preparation pauses before transport/presence
        // reconciliation. This prevents a restart from becoming a fictional
        // departure and does not advance time, sequence, randomness or IDs.
        // Merely reopening must also keep the saved earned-value window and
        // mechanical remainder; actual semantic edits settle their own inputs.
        super::host_control::set_paused(core, true);
        let budget = core.journal.byte_budget().clone();
        crate::construction_gather::reconcile(core, &budget)?;
        Ok(CompletedStartup {
            protected: self.protected,
            outcome: crate::commands::Outcome {
                ok: true,
                code: "startup".into(),
                message: "".into(),
                spent: None,
                outputs: None,
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            _storage: storage,
        })
    }
}

fn install_owners(
    core: &mut CoreMutation<'_>,
    owners: &[RestoreBinding],
) -> Result<(), ExecutionError> {
    let mut changed_controller = false;
    for binding in owners {
        let actor = core
            .state
            .physical
            .entities
            .get(&binding.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if core
            .state
            .administration
            .authorship
            .player_account_ids
            .get(&binding.actor_id)
            .is_some_and(|owner| owner != &binding.account_id)
        {
            return Err(ExecutionError::Invariant);
        }
        changed_controller |= actor.controller != "player";
    }
    // A controller change changes automatic status eligibility. Account-only
    // enrollment keeps the earned window, as in checkpoint recovery.
    if changed_controller {
        core.settle_numeric_prediction()?;
    }
    for binding in owners {
        core.physical()
            .reconcile_actor_access(&binding.actor_id, true)?;
    }
    core.journal.restore_metadata.enroll_owners(
        core.state,
        owners
            .iter()
            .map(|binding| (binding.actor_id.as_str(), binding.account_id.as_str())),
    )
}
