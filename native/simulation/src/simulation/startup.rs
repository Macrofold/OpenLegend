//! Existing current worlds reopen paused and reconcile hot-event progression
//! before first disclosure. Prepared creation has its separate activation path.
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

/// Reopening an existing current world reconciles its installed hot events once.
/// The completion is not an event replay: Session applies the same sparse host
/// journal used by live speech and keeps old events out of publication/history.
pub(super) struct StartupCursor {
    storage: Option<ByteReservation>,
}
pub(crate) struct CompletedStartup {
    pub(super) outcome: crate::commands::Outcome,
    _storage: ByteReservation,
}
impl StartupCursor {
    pub(super) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            storage: Some(
                budget
                    .reserve(size_of::<Self>() + size_of::<CompletedStartup>() + "startup".len())?,
            ),
        })
    }
    pub(super) fn complete(
        &mut self,
        core: &mut crate::execution::CoreMutation<'_>,
    ) -> Result<CompletedStartup, ExecutionError> {
        let storage = self
            .storage
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        core.materialize_world_edit()?;
        // Source current-world preparation pauses before transport/presence
        // reconciliation. This prevents a restart from becoming a fictional
        // departure and does not advance time, sequence, randomness or IDs.
        super::host_control::set_paused(core, true);
        Ok(CompletedStartup {
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
